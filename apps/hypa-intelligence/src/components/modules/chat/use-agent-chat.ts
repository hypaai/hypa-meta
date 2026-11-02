import { useCallback, useRef, useState } from "react";
import {
  AgentStreamError,
  applyAgentEvent,
  streamAgent,
  waitForAgent,
  type AgentEvent,
  type AgentReply,
} from "@hypa/intelligence-core/agent-stream";

import { agentConnection } from "@/lib/api";
import { analytics } from "@/lib/analytics";

export interface ChatTurn {
  text: string;
  images?: { data: string; mime: string; preview: string }[];
  audio?: string;
}

export interface ChatMessage extends AgentReply {
  id: string;
  role: "user" | "assistant";
  images?: string[];
}

/**
 * One chat in memory for this tab. Nothing is stored: a reload or "New chat"
 * clears it, and the API saves nothing for anonymous turns.
 */
export function useAgentChat(options: {
  provider: string;
  model: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);

  const patch = useCallback((id: string, next: (message: ChatMessage) => Partial<ChatMessage>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...next(message) } : message)),
    );
  }, []);

  const send = useCallback(
    async (turn: ChatTurn) => {
      const requestId = crypto.randomUUID();
      const userId = `u-${requestId}`;
      const replyId = `a-${requestId}`;
      const kind = turn.audio ? "voice" : turn.images?.length ? "photo" : "text";

      if (!started.current) {
        started.current = true;
        analytics.capture("chat_started");
      }
      analytics.capture("chat_message_sent", { kind });
      setBusy(true);
      setMessages((current) => [
        ...current,
        {
          id: userId,
          role: "user",
          status: "success",
          content: turn.text || (turn.audio ? "Voice message" : ""),
          images: turn.images?.map((image) => image.preview),
        },
        { id: replyId, role: "assistant", status: "pending", content: "" },
      ]);

      const onEvent = (event: AgentEvent) => {
        if (event.type === "transcript") {
          patch(userId, () => ({ content: event.text }));

          return;
        }
        if (event.type === "tool_result") {
          analytics.capture("chat_tool_used", { tool: event.name, ok: event.ok });
        }
        if (event.type === "error") analytics.capture("chat_error", { code: event.code });
        patch(replyId, (message) => applyAgentEvent(message, event));
      };

      try {
        await streamAgent({
          connection: agentConnection(),
          body: {
            requestId,
            provider: options.provider,
            model: options.model,
            input: turn.text,
            surface: "app",
            ...(turn.audio ? { audio: turn.audio, audioType: "base64" as const } : {}),
            ...(turn.images?.length
              ? { attachments: turn.images.map(({ data, mime }) => ({ data, mime })) }
              : {}),
          },
          onEvent,
        });
      } catch (error) {
        if (error instanceof AgentStreamError) {
          onEvent({ type: "error", code: String(error.status ?? "request"), message: error.message });
        } else {
          // The stream dropped; the server finishes the turn and holds it briefly.
          patch(replyId, () => ({ activity: "Reconnecting" }));
          try {
            const status = await waitForAgent({ connection: agentConnection(), requestId });

            patch(replyId, () =>
              status.status === "done"
                ? {
                    status: "success",
                    content: status.message,
                    activity: undefined,
                    ...(status.audioUrl ? { audioUrl: status.audioUrl } : {}),
                  }
                : { status: "error", activity: undefined, content: "That didn't finish. Try again." },
            );
          } catch {
            patch(replyId, () => ({
              status: "error",
              activity: undefined,
              content: "The connection dropped. Try again.",
            }));
          }
        }
      } finally {
        patch(replyId, (message) => (message.status === "pending" ? { status: "success" } : {}));
        setBusy(false);
      }
    },
    [options.model, options.provider, patch],
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, busy, send, reset };
}
