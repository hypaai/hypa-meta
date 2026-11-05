import {
  All,
  Controller,
  Get,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  Query,
  Req,
  Res,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MCP_SPEND_CAP_USD } from '@hypa/config/agent';
import { HYPA_TOOLS, runHypaTool, ToolFailure, toMcpTool, toolFailureBody, type HypaTool } from '@hypa/intelligence-core';
import type { Request, Response } from 'express';
import { DbService } from 'src/libs/db/db.service';
import { DeveloperSharedService } from '../developer/providers/shared.service';
import { WsAuthService } from '../developer/ws/ws-auth.service';
import { StorageService } from 'src/libs/shared/storage.service';
import { AgentMediaService, MCP_MEDIA_OWNER } from './agent.media';
import { mediaBaseUrl, mediaOwner, verifyMediaUrl } from './media-url';
import { detectAudioMime } from 'src/libs/shared/audio-mime';
import { anonymousPayerId, HypaToolExecutor, type ToolCaller } from './tool-executor';
import { SpendCap } from 'src/libs/shared/spend-cap';
import { McpAnonymousBudget } from './mcp-anonymous-budget';

// Tools that never charge, so they do not draw on the anonymous daily budget.
const FREE_TOOLS = new Set([
  'list_voices',
  'word_of_the_day',
  'list_languages',
  'check_language_pair',
  'list_models',
]);

// Not read-only: every tool call charges the caller's balance.
const annotations = { readOnlyHint: false, openWorldHint: true, destructiveHint: false };

/**
 * Public MCP endpoint for external clients (Claude, ChatGPT, Codex, ...).
 * Serves the same `HYPA_TOOLS` the agent uses, through the same executor,
 * billed to the caller's API key, login, or Hypa's anonymous account.
 * Stateless: each POST gets its own server, so no session state is kept.
 * Speech comes back as a link that works for about an hour (`GET /v2/mcp/audio`).
 */
@Controller('v2/mcp')
export class McpController implements OnModuleInit {
  private audioStorageReady = false;
  private audioStorageCheck?: Promise<void>;
  private audioStorageRetryAt = 0;
  constructor(
    private readonly tools: HypaToolExecutor,
    private readonly keys: WsAuthService,
    private readonly jwt: JwtService,
    private readonly db: DbService,
    private readonly billing: DeveloperSharedService,
    private readonly media: AgentMediaService,
    private readonly storage: StorageService,
    private readonly anonymousBudget: McpAnonymousBudget,
  ) {}

  /** MCP audio is only needed while its link works; the bucket deletes it after a day. */
  async onModuleInit() {
    // A storage outage must not stop unrelated tools or base64 speech.
    await this.ensureAudioStorage().catch(() => undefined);
  }

  private async ensureAudioStorage(): Promise<void> {
    if (this.audioStorageReady) return;
    if (this.audioStorageCheck) return this.audioStorageCheck;
    if (Date.now() < this.audioStorageRetryAt) throw this.audioStorageUnavailable();
    this.audioStorageCheck = this.storage
      .deleteAfterDays(`agent/${MCP_MEDIA_OWNER}/`, 1)
      .then(() => {
        this.audioStorageReady = true;
      })
      .catch((error: unknown) => {
        this.audioStorageRetryAt = Date.now() + 30_000;
        new Logger(McpController.name).error(
          `MCP audio storage unavailable: could not verify its one-day bucket cleanup rule: ${String(error)}`,
        );
        throw this.audioStorageUnavailable();
      })
      .finally(() => {
        this.audioStorageCheck = undefined;
      });
    return this.audioStorageCheck;
  }

  private audioStorageUnavailable() {
    return new ServiceUnavailableException('MCP audio storage is unavailable until bucket cleanup is verified. Retry shortly or use format: "base64".');
  }

  /** Plays MCP speech. The signed link is the only key, so no login is needed. */
  @Get('audio')
  async audio(
    @Query('key') key: unknown,
    @Query('exp') exp: unknown,
    @Query('sig') sig: unknown,
    @Res() res: Response,
  ) {
    // A repeated query param arrives as an array; only plain strings are valid.
    const valid =
      typeof key === 'string' &&
      typeof sig === 'string' &&
      mediaOwner(key) === MCP_MEDIA_OWNER &&
      verifyMediaUrl(key, Number(exp), sig, Date.now(), this.media.secret());
    const bytes = valid ? await this.media.get(key as string) : null;
    if (!bytes) throw new NotFoundException();
    res.setHeader('Content-Type', detectAudioMime(bytes) ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(bytes);
  }

  @All()
  async handle(@Req() req: Request, @Res() res: Response) {
    if (req.method !== 'POST') {
      res.status(405).set('Allow', 'POST').json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      });
      return;
    }
    const server = await this.createServer(req);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  private async createServer(req: Request): Promise<McpServer> {
    // Anonymous tools share one cap per POST. Authenticated callers use their wallet.
    // TODO: Remove keyless /v2/mcp access later so external agents always need a key or login.
    // Until then, keyless calls bill Hypa and are capped by the shared daily budget.
    const anonymous = !req.headers['x-api-key'] && !req.headers.authorization;
    if (anonymous && !anonymousPayerId()) throw new UnauthorizedException('An API key is required');
    // Authenticate credentials now; anonymous protocol setup needs no billing key.
    const authenticated = anonymous ? undefined : await this.caller(req);
    const spend = anonymous ? new SpendCap(MCP_SPEND_CAP_USD, () => 0) : undefined;
    let caller: Promise<ToolCaller> | undefined;
    const resolveCaller = () =>
      caller ??= (authenticated ? Promise.resolve(authenticated) : this.caller(req))
        .then((value) => ({ ...value, spend }));
    const reserve = this.anonymousBudget.forRequest(anonymous);
    return mcpServer(this.tools, resolveCaller, (audio) => this.storeAudio(audio),
      async (tool, args) => {
        // Check before combo tools do any paid translation or speech work.
        if ('audioBase64' in tool.outputSchema.shape && args.format !== 'base64') {
          mediaBaseUrl();
          await this.ensureAudioStorage();
        }
        if (!FREE_TOOLS.has(tool.name)) await reserve();
      });
  }

  private async storeAudio(audio: string): Promise<string> {
    await this.ensureAudioStorage();
    return this.media.publicUrl(await this.media.put(MCP_MEDIA_OWNER, Buffer.from(audio, 'base64')));
  }

  /** API key (header or non-JWT Bearer) or login → that account; nothing → anonymous. */
  private async caller(req: Request): Promise<ToolCaller> {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme === 'Bearer' && token && !isJwt(token) && !req.headers['x-api-key']) {
      req.headers['x-api-key'] = token;
      delete req.headers.authorization;
    }
    const apiKeyHeader = req.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string' && apiKeyHeader) {
      const validated = await this.keys.validate(apiKeyHeader);
      if (!validated) throw new UnauthorizedException('An API key is required');
      return { userId: validated.userId, apiKeyId: validated.apiKeyId };
    }
    if (req.headers.authorization) {
      const [, jwt] = req.headers.authorization.split(' ') ?? [];
      let userId: string | undefined;
      try {
        const decoded = this.jwt.verify(jwt, { secret: process.env.JWT_SECRET }) as
          | { sub?: string; id?: string; userId?: string }
          | string;
        userId = typeof decoded === 'string' ? undefined : (decoded.sub || decoded.id || decoded.userId);
      } catch {
        throw new UnauthorizedException('An API key is required');
      }
      const user = userId ? await this.db.user.findUnique({ where: { id: userId }, select: { id: true } }) : null;
      if (!user) throw new UnauthorizedException('An API key is required');
      const apiKey = await this.billing.findOrCreateUserApiKey(user.id);
      return { userId: user.id, apiKeyId: apiKey.id };
    }
    const userId = anonymousPayerId();
    if (!userId) throw new UnauthorizedException('An API key is required');
    const apiKey = await this.billing.findOrCreateUserApiKey(userId);
    return { userId, apiKeyId: apiKey.id };
  }
}

/**
 * An MCP server with every Hypa tool, run for one caller. `audioLink` stores
 * speech and returns its link, so clients get a URL instead of megabytes of base64.
 */
export function mcpServer(
  tools: HypaToolExecutor,
  caller: ToolCaller | (() => Promise<ToolCaller>),
  audioLink: (audioBase64: string) => Promise<string>,
  beforeTool: (tool: HypaTool, args: Record<string, unknown>) => Promise<void> = () => Promise.resolve(),
): McpServer {
  const server = new McpServer({ name: 'hypa-intelligence', version: '1.0.0' });
  for (const tool of HYPA_TOOLS) {
    const published = toMcpTool(tool);
    server.registerTool(
      tool.name,
      {
        title: published.title,
        description: published.description,
        inputSchema: published.inputSchema,
        outputSchema: published.outputSchema,
        annotations,
      },
      async (args: Record<string, unknown>, extra: { signal: AbortSignal }) => {
        try {
          await beforeTool(tool, args);
          const resolved = typeof caller === 'function' ? await caller() : caller;
          let result = await runHypaTool(tool, tools.forCaller({ ...resolved, signal: extra.signal }), args);
          if ('audioBase64' in result && !result.audioBase64) {
            const translatedText = result.translatedText;
            throw new ToolFailure('Speech returned no audio', 'speech', typeof translatedText === 'string' ? { translatedText } : undefined);
          }
          if (typeof result.audioBase64 === 'string' && result.audioBase64 && args.format !== 'base64') {
            const { audioBase64, ...rest } = result;
            result = { ...rest, audioUrl: await audioLink(audioBase64) };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result };
        } catch (error) {
          return { content: [{ type: 'text' as const, text: JSON.stringify(toolFailureBody(error)) }], isError: true };
        }
      },
    );
  }
  return server;
}

function isJwt(token: string) {
  return token.split('.').length === 3;
}
