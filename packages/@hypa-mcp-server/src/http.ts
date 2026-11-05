/**
 * Reusable Streamable-HTTP MCP host for @hypa/mcp-server.
 *
 * One host process can serve any McpServer toolset. It mints a fresh McpServer
 * per `initialize` session — an McpServer instance can connect to exactly one
 * transport — and routes later requests by their `Mcp-Session-Id`, so multiple
 * sessions never share a server/transport. The Hypa product tools are served by
 * hypa-api at `/v2/mcp`, not here.
 */

import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { resolveMcpPath } from "./mcp-path.js";

export interface McpHttpHost {
  app: express.Express;
  /** Start listening (port 0 picks a free port) and resolve once ready. */
  listen(port?: number, host?: string): Promise<{
    url: string;
    close: () => Promise<void>;
  }>;
}

const SESSION_IDLE_MS = 30 * 60_000;

const sendError = (res: express.Response, code: number, message: string): void => {
  res.status(code).json({ jsonrpc: "2.0", error: { code, message }, id: null });
};

export function createMcpHttpHost(options: {
  /** Mint a fresh server for each new session (never a shared instance). */
  createServer: () => McpServer;
  /** Service name surfaced by GET /health. */
  name: string;
  /** Defaults to `/v2/mcp`, or `MCP_PATH` / `MCP_VERSION` when set. */
  path?: string;
}): McpHttpHost {
  const { createServer, name } = options;
  const mcpPath = options.path ?? resolveMcpPath();
  const sessions = new Map<string, StreamableHTTPServerTransport>();
  // Clients often leave without closing, so drop sessions idle for 30 minutes.
  const idleTimers = new Map<string, NodeJS.Timeout>();
  const touch = (sid: string, transport: StreamableHTTPServerTransport) => {
    clearTimeout(idleTimers.get(sid));
    const timer = setTimeout(() => void transport.close(), SESSION_IDLE_MS);
    timer.unref();
    idleTimers.set(sid, timer);
  };
  const app = express();

  app.use(express.json({ limit: "30mb" }));

  app.all(mcpPath, async (req, res) => {
    const header = req.headers["mcp-session-id"];
    const sessionId = typeof header === "string" ? header : undefined;
    try {
      if (sessionId) {
        const transport = sessions.get(sessionId);
        if (transport) {
          touch(sessionId, transport);
          await transport.handleRequest(req, res, req.body);
          return;
        }
        sendError(res, 404, "Session not found");
        return;
      }
      if (req.method === "POST" && isInitializeRequest(req.body)) {
        const server = createServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            sessions.set(sid, transport);
            touch(sid, transport);
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (!sid) return;
          sessions.delete(sid);
          clearTimeout(idleTimers.get(sid));
          idleTimers.delete(sid);
        };
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }
      sendError(res, 400, "Bad Request: missing or unknown Mcp-Session-Id");
    } catch (error) {
      console.error(`MCP request failed (${name}):`, error);
      if (!res.headersSent) sendError(res, 500, "Internal server error");
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: name });
  });

  const listen = (port = 0, host = "127.0.0.1") =>
    new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
      const listener: Server = app.listen(port, host, () => {
        const address = listener.address();
        const actualPort =
          address && typeof address === "object" ? address.port : port;
        resolve({
          url: `http://${host}:${actualPort}${mcpPath}`,
          close: () => new Promise<void>((done) => listener.close(() => done())),
        });
      });
    });

  return { app, listen };
}
