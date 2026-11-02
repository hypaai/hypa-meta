/// <reference lib="dom" />
import type { AgentHistoryMessage } from "./agent-history";
export { boundAgentHistory, historyData, type AgentHistoryEvent, type AgentHistoryMessage } from "./agent-history";
/**
 * Browser-safe client for `POST /v2/agent` (SSE) and `GET /v2/agent/:requestId`.
 * Shared by Hypa Chat web and Intelligence web, and later the mobile apps, so
 * the event contract lives in one place. No Node-only imports here.
 */

export interface AgentUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export type AgentEvent =
  | { type: "transcript"; text: string }
  | ({ type: "approval" } & PaymentApproval)
  | { type: "tool_call"; id: string; name: string; args: unknown }
  | {
      type: "tool_result";
      id: string;
      name: string;
      ok: boolean;
      summary?: string;
      result?: unknown;
      durationMs?: number;
      error?: string;
      provider?: string;
      model?: string;
    }
  | { type: "delta"; text: string }
  | { type: "audio"; id?: string; toolCallId?: string; url: string; mime?: string; durationMs?: number }
  | { type: "image"; id: string; toolCallId: string; url: string; mime?: string }
  | {
      type: "done";
      action: "replace" | "insert" | "show";
      text: string;
      speak: boolean;
      usage?: AgentUsage;
      /** USD charged for the turn (model and tools). */
      cost?: number;
      audioUrl?: string;
      chatId?: string;
      messageId?: string;
    }
  | { type: "error"; code: string; message: string };

export interface AgentRequestBody {
  requestId: string;
  provider: string;
  model: string;
  input?: string;
  history?: AgentHistoryMessage[];
  surface?: "app" | "keyboard";
  chatId?: string;
  language?: string;
  audio?: string;
  audioType?: "base64" | "url";
  attachments?: { data: string; mime?: string }[];
  files?: { data: string; mime: string; name: string }[];
  context?: { fieldText?: string; selectedText?: string };
  asr?: { provider: string; model: string };
  preferAudio?: boolean;
}

export interface AgentConnection {
  /** API origin, e.g. `https://api.hypaintelligence.com`. */
  baseUrl: string;
  /** Login token. Omit for anonymous users. */
  token?: string;
  headers?: Record<string, string>;
  /** Native clients supply Expo's streaming fetch; browsers use the global fetch. */
  fetch?: typeof fetch;
}

export class AgentStreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const authHeaders = (connection: AgentConnection): Record<string, string> => ({
  ...connection.headers,
  ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}),
});

async function readError(response: Response): Promise<AgentStreamError> {
  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join(", ");
  } catch {
    // Keep the status message.
  }
  return new AgentStreamError(message, response.status);
}

/** Splits an SSE text stream into the JSON `data:` payloads, across chunk boundaries. */
export function createSseParser(onData: (data: string) => void) {
  let buffer = "";
  let data: string[] = [];
  const flush = () => {
    if (data.length) onData(data.join("\n"));
    data = [];
  };
  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line === "") flush();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
    },
    end() {
      if (buffer.startsWith("data:")) data.push(buffer.slice(5).trimStart());
      buffer = "";
      flush();
    },
  };
}

/**
 * Streams one agent turn. Resolves when the stream ends. Throws
 * `AgentStreamError` when the request is rejected or the connection drops, so
 * the caller can reconnect with `getAgentStatus` using the same `requestId`.
 */
export async function streamAgent(input: {
  connection: AgentConnection;
  body: AgentRequestBody;
  onEvent: (event: AgentEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const response = await (input.connection.fetch ?? fetch)(`${input.connection.baseUrl}/v2/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(input.connection),
    },
    body: JSON.stringify(input.body),
    signal: input.signal,
  });
  if (!response.ok || !response.body) throw await readError(response);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser((data) => {
    try {
      input.onEvent(JSON.parse(data) as AgentEvent);
    } catch {
      // Skip a malformed frame rather than dropping the turn.
    }
  });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.end();
}

export interface AgentStatus {
  status: "running" | "done" | "failed";
  message: string;
  /** The keyboard outcome, so a reconnecting client can apply it like a live `done`. */
  action?: "replace" | "insert" | "show";
  audioUrl?: string;
  chatId?: string;
  approval?: PaymentApproval;
}

export async function getAgentStatus(input: {
  connection: AgentConnection;
  requestId: string;
  signal?: AbortSignal;
}): Promise<AgentStatus> {
  const response = await (input.connection.fetch ?? fetch)(
    `${input.connection.baseUrl}/v2/agent/${encodeURIComponent(input.requestId)}`,
    { headers: authHeaders(input.connection), signal: input.signal },
  );
  if (!response.ok) throw await readError(response);
  return (await response.json()) as AgentStatus;
}

/** Explicit Stop leaves accidental stream disconnects free to reconnect. */
export async function cancelAgent(input: {
  connection: AgentConnection;
  requestId: string;
}): Promise<void> {
  // Stop can race the original POST while it is still opening the run.
  for (let attempt = 0; ; attempt++) {
    const response = await (input.connection.fetch ?? fetch)(
      `${input.connection.baseUrl}/v2/agent/${encodeURIComponent(input.requestId)}/cancel`,
      { method: "POST", headers: authHeaders(input.connection), signal: AbortSignal.timeout(5000) },
    );
    if (response.ok) return;
    if (response.status !== 404 || attempt >= 9) throw await readError(response);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/** Polls a dropped turn until it finishes. Reconnecting never charges again. */
export async function waitForAgent(input: {
  connection: AgentConnection;
  requestId: string;
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<AgentStatus> {
  const deadline = Date.now() + (input.timeoutMs ?? 90_000);
  for (;;) {
    const status = await getAgentStatus(input);
    if (status.status !== "running" || Date.now() > deadline) return status;
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => {
        input.signal?.removeEventListener("abort", abort);
        resolve();
      }, input.intervalMs ?? 1500);
      if (input.signal?.aborted) abort();
      else input.signal?.addEventListener("abort", abort, { once: true });
    });
  }
}

/**
 * Returns a playable URL. Inline (anonymous) audio is already a data URL.
 * Stored audio needs the login token, so it is fetched into a blob URL.
 */
export async function resolveAgentAudio(
  url: string,
  connection: AgentConnection,
  createUrl: (bytes: ArrayBuffer, mime: string) => string | Promise<string> = (bytes, mime) =>
    URL.createObjectURL(new Blob([bytes], { type: mime })),
): Promise<string> {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const absolute = /^https?:/.test(url) ? url : `${connection.baseUrl}${url}`;
  const response = await (connection.fetch ?? fetch)(absolute, { headers: authHeaders(connection) });
  if (!response.ok) throw await readError(response);
  return createUrl(await response.arrayBuffer(), response.headers.get("content-type") ?? "audio/wav");
}

/** One short line per tool: what is running, or what failed. Never the full trace. */
const TOOL_LABELS: Record<string, { running: string; failed: string; done: string }> = {
  translate_message: { running: "Translating", failed: "Couldn't translate the text.", done: "Translated" },
  text_to_speech: { running: "Creating audio", failed: "Couldn't create the audio.", done: "Spoke" },
  speech_to_text: { running: "Transcribing", failed: "Couldn't transcribe the audio.", done: "Transcribed" },
  look_up_term: { running: "Looking up the word", failed: "Couldn't look up the word.", done: "Looked up" },
  extract_text_from_image: { running: "Reading the image", failed: "Couldn't read the image.", done: "Read image" },
  list_languages: { running: "Checking languages", failed: "Couldn't load the languages.", done: "Checked languages" },
  translate_document: { running: "Translating the document", failed: "Couldn't translate the document.", done: "Translated the document" },
  translate_and_speak: { running: "Translating and speaking", failed: "Couldn't translate and speak that.", done: "Translated and spoke" },
  translate_image: { running: "Translating the image", failed: "Couldn't translate the image.", done: "Translated the image" },
  create_image: { running: "Creating the picture", failed: "Couldn't create the picture.", done: "Created a picture" },
  process_voice_message: { running: "Listening to the voice message", failed: "Couldn't process the voice message.", done: "Processed the voice message" },
  check_language_pair: { running: "Checking the language pair", failed: "Couldn't check the language pair.", done: "Checked the language pair" },
  list_models: { running: "Checking models", failed: "Couldn't load the models.", done: "Checked models" },
  list_voices: { running: "Checking voices", failed: "Couldn't load the voices.", done: "Checked voices" },
  word_of_the_day: { running: "Getting the word of the day", failed: "Couldn't get the word of the day.", done: "Got the word of the day" },
  paypal: { running: "Handling the payment", failed: "Couldn't complete the payment step.", done: "Handled the payment" },
};

export function toolLabels(name?: string) {
  return (
    TOOL_LABELS[name ?? ""] ?? {
      running: "Using a tool",
      failed: "A tool failed.",
      done: "Used a tool",
    }
  );
}

/** The internal keyboard `finish` tool is not a user-visible step. */
export const isVisibleTool = (name?: string) => name !== "finish";

export interface AgentStep {
  id: string;
  name: string;
  label: string;
  status: "running" | "ok" | "failed";
  provider?: string;
  model?: string;
  detail?: string;
  args?: unknown;
  result?: unknown;
  startedAt: number;
  ms?: number;
}

/** One spoken clip a tool made, in the order it arrived. */
export interface AgentAudioClip {
  id?: string;
  toolCallId?: string;
  url: string;
  durationMs?: number;
}

/** Adds a clip unless it is already there: the stream repeats the latest one, and signed links change per call. */
export function addAudioClip(clips: AgentAudioClip[] | undefined, clip: AgentAudioClip): AgentAudioClip[] {
  const known = clips?.some((existing) => (clip.id ? existing.id === clip.id : existing.url === clip.url));

  return !clip.url || known ? (clips ?? []) : [...(clips ?? []), clip];
}

/** The parts of a chat reply that agent events change. Apps extend it with their own fields. */
export interface AgentReply {
  content: string;
  status: "pending" | "success" | "error";
  /** The tool running now, e.g. "Translating". */
  activity?: string;
  /** One line per failed tool, e.g. "Couldn't create the audio." */
  failedTools?: string[];
  /** Every tool call and result, for a steps view. */
  steps?: AgentStep[];
  /** A data URL (anonymous) or an API media path (signed in). */
  audioUrl?: string;
  /** Every clip the tools made, for a player list. `audioUrl` is the latest of them. */
  audioClips?: AgentAudioClip[];
  /** Pictures the agent made: signed links that load without a login for about an hour. */
  imageUrls?: string[];
  /** Keyboard surface outcome. */
  action?: "replace" | "insert" | "show";
  usage?: AgentUsage;
  /** USD charged for the turn (model and tools). */
  cost?: number;
  /** Draft payment order awaiting the merchant's explicit approval. */
  approval?: PaymentApproval & { status: "draft" | "approved" | "cancelled" | "paid" | "failed" };
}

export interface PaymentApproval {
  orderId: string;
  amount: string;
  currency: string;
  fee: { amount: string; currency: string };
  customer: { name: string; contact: string; language: string | null };
  items: { name: string; qty: number; unitPrice: string }[];
  merchantLanguage: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  budget_exceeded:
    "This request hit its limit (time, tool rounds or spend). Try a shorter ask.",
};

/** Folds one `/v2/agent` event into the reply it belongs to. */
export function applyAgentEvent(
  reply: AgentReply,
  event: AgentEvent,
  now = Date.now(),
): Partial<AgentReply> {
  switch (event.type) {
    case "approval":
      return {
        approval: {
          orderId: event.orderId,
          amount: event.amount,
          currency: event.currency,
          fee: event.fee,
          customer: event.customer,
          items: event.items,
          merchantLanguage: event.merchantLanguage,
          status: "draft",
        },
      };
    case "delta":
      return { content: reply.content + event.text };
    case "tool_call": {
      if (!isVisibleTool(event.name)) return {};
      const label = toolLabels(event.name);
      const step: AgentStep = {
        id: event.id,
        name: event.name,
        label: label.done,
        status: "running",
        startedAt: now,
        args: event.args,
      };
      return { activity: label.running, steps: [...(reply.steps ?? []), step] };
    }
    case "tool_result": {
      if (!isVisibleTool(event.name)) return {};
      const label = toolLabels(event.name);
      const steps = (reply.steps ?? []).map((step) =>
        step.id === event.id
          ? {
              ...step,
              status: event.ok ? ("ok" as const) : ("failed" as const),
              provider: event.provider,
              model: event.model,
              detail: event.ok ? event.summary : event.error,
              result: event.result,
              ms: typeof event.durationMs === "number" && Number.isFinite(event.durationMs) && event.durationMs >= 0
                ? event.durationMs
                : Math.max(0, now - step.startedAt),
            }
          : step,
      );
      const failedTools =
        event.ok || reply.failedTools?.includes(label.failed)
          ? reply.failedTools
          : [...(reply.failedTools ?? []), label.failed];
      return { steps, failedTools };
    }
    case "audio":
      return {
        audioUrl: event.url,
        audioClips: addAudioClip(reply.audioClips, {
          id: event.id,
          toolCallId: event.toolCallId,
          url: event.url,
          durationMs: event.durationMs,
        }),
      };
    case "image":
      return { imageUrls: [...(reply.imageUrls ?? []), event.url] };
    case "done":
      return {
        status: "success",
        content: event.text || reply.content,
        action: event.action,
        usage: event.usage,
        cost: event.cost,
        activity: undefined,
        ...(event.audioUrl
          ? {
              audioUrl: event.audioUrl,
              // `audioUrl` is the latest clip, which the tool events already added.
              audioClips: reply.audioClips?.length ? reply.audioClips : addAudioClip(undefined, { url: event.audioUrl }),
            }
          : {}),
      };
    case "error":
      return {
        status: "error",
        activity: undefined,
        content: ERROR_MESSAGES[event.code] ?? event.message ?? "The request failed",
      };
    default:
      return {};
  }
}

/** Rebuilds steps and failures from a saved message's `tool_trace`. */
export function stepsFromTrace(trace: unknown): Pick<AgentReply, "steps" | "failedTools" | "approval"> {
  if (!Array.isArray(trace)) return {};
  let reply: AgentReply = { content: "", status: "success", steps: [] };
  for (const event of trace as AgentEvent[]) {
    if (event?.type !== "tool_call" && event?.type !== "tool_result" && event?.type !== "approval") continue;
    reply = { ...reply, ...applyAgentEvent(reply, event, 0) };
  }
  return { steps: reply.steps, failedTools: reply.failedTools, approval: reply.approval };
}

/** A browser `File` (image) to an agent attachment, downscaled to fit `maxSide`. */
export async function imageToAttachment(
  file: Blob,
  maxSide = 1600,
): Promise<{ data: string; mime: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
  const preview = await blobToDataUrl(blob);
  return { data: preview.split(",")[1] ?? "", mime: "image/jpeg", preview };
}

/** A recorded audio blob to base64 (no data-URL prefix). */
export async function blobToBase64(blob: Blob): Promise<string> {
  return (await blobToDataUrl(blob)).split(",")[1] ?? "";
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(binary)}`;
}
