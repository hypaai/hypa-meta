import type { ChatAttachment } from "./chat-attachments";

import { useCallback, useRef, useState } from "react";
import {
  addAudioClip,
  cancelAgent,
  AgentStreamError,
  applyAgentEvent,
  streamAgent,
  waitForAgent,
  type AgentEvent,
} from "@hypa/intelligence-core/agent-stream";

import {
  appendHistoryEvent,
  audioNamesFor,
  conversationHistory,
  type ConversationMessage,
} from "./chat-history";

import { agentConnection } from "@/lib/api";
import { analytics } from "@/lib/analytics";

export interface ChatTurn {
  text: string;
  files?: ChatAttachment[];
}

export interface ChatMessage extends ConversationMessage {
  id: string;
  role: "user" | "assistant";
  images?: string[];
  /** Voice notes and audio files the user sent. */
  audio?: ChatAttachment[];
  /** On a reply: the recording names as the server numbered them for this turn. */
  audioNames?: string[];
  /** When a user message was sent, or an assistant message finished. */
  timestamp?: string;
}

/**
 * One chat in memory for this tab. Nothing is stored: a reload or "New chat"
 * clears it, and the API saves nothing for anonymous turns.
 */
export function useAgentChat(options: { provider: string; model: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const started = useRef(false);
  const sending = useRef(false);
  const active = useRef<{
    requestId: string;
    replyId: string;
    controller: AbortController;
    stopped: boolean;
  } | null>(null);

  const patch = useCallback(
    (id: string, next: (message: ChatMessage) => Partial<ChatMessage>) => {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== id) return message;
          const change = next(message);
          const finished =
            change.status !== undefined && change.status !== "pending";

          return {
            ...message,
            ...change,
            ...(finished && !message.timestamp
              ? { timestamp: new Date().toISOString() }
              : {}),
          };
        }),
      );
    },
    [],
  );

  const stop = useCallback(async () => {
    const run = active.current;

    if (!run || run.stopped) return;
    run.stopped = true;
    let confirmed = true;

    try {
      await cancelAgent({
        connection: agentConnection(),
        requestId: run.requestId,
      });
    } catch {
      confirmed = false;
    } finally {
      run.controller.abort();
      patch(run.replyId, (message) => ({
        status: "error",
        activity: undefined,
        content: confirmed
          ? message.content || "Stopped."
          : `${message.content ? `${message.content}\n\n` : ""}Stopped waiting, but couldn't confirm cancellation on the server.`,
        trace: appendHistoryEvent(message.trace ?? [], {
          type: "error",
          code: "request_cancelled",
          message: "Stopped.",
        }),
      }));
      if (active.current === run) {
        active.current = null;
        sending.current = false;
        setBusy(false);
      }
    }
  }, [patch]);

  const send = useCallback(
    async (turn: ChatTurn) => {
      if (sending.current) return;
      sending.current = true;
      const requestId = crypto.randomUUID();
      const userId = `u-${requestId}`;
      const replyId = `a-${requestId}`;
      const run = {
        requestId,
        replyId,
        controller: new AbortController(),
        stopped: false,
      };

      active.current = run;
      const files = turn.files ?? [];
      const history = conversationHistory(messages);
      const kind = files.some((file) => file.kind === "audio")
        ? "voice"
        : files.length
          ? "photo"
          : "text";

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
          content: turn.text,
          images: files
            .filter((file) => file.kind === "image")
            .map((file) => file.url),
          audio: files.filter((file) => file.kind === "audio"),
          timestamp: new Date().toISOString(),
        },
        {
          id: replyId,
          role: "assistant",
          status: "pending",
          content: "",
          audioNames: audioNamesFor(history, files),
        },
      ]);

      let terminalEvent = false;
      const onEvent = (event: AgentEvent) => {
        if (run.stopped) return;
        if (event.type === "done" || event.type === "error")
          terminalEvent = true;
        if (event.type === "tool_result") {
          analytics.capture("chat_tool_used", {
            tool: event.name,
            ok: event.ok,
          });
        }
        if (event.type === "error")
          analytics.capture("chat_error", { code: event.code });
        patch(replyId, (message) => ({
          ...applyAgentEvent(message, event),
          trace: appendHistoryEvent(message.trace ?? [], event),
        }));
      };

      try {
        await streamAgent({
          connection: agentConnection(),
          body: {
            requestId,
            provider: options.provider,
            model: options.model,
            input: turn.text,
            history,
            surface: "app",
            ...(files.length
              ? {
                  files: files.map(({ data, mime, name }) => ({
                    data,
                    mime,
                    name,
                  })),
                }
              : {}),
          },
          onEvent,
          signal: run.controller.signal,
        });
        if (!terminalEvent)
          throw new Error("The stream ended before the reply finished.");
      } catch (error) {
        if (run.stopped || run.controller.signal.aborted) return;
        if (error instanceof AgentStreamError) {
          onEvent({
            type: "error",
            code: String(error.status ?? "request"),
            message: error.message,
          });
        } else {
          // The stream dropped; the server finishes the turn and holds it briefly.
          patch(replyId, () => ({ activity: "Reconnecting" }));
          try {
            const status = await waitForAgent({
              connection: agentConnection(),
              requestId,
              signal: run.controller.signal,
            });

            if (run.stopped) return;

            patch(replyId, (message) =>
              status.status === "done"
                ? {
                    status: "success",
                    content: status.message,
                    trace: message.trace?.filter(
                      (event) => event.type !== "delta",
                    ),
                    activity: undefined,
                    ...(status.audioUrl
                      ? {
                          audioUrl: status.audioUrl,
                          audioClips: addAudioClip(message.audioClips, {
                            url: status.audioUrl,
                          }),
                        }
                      : {}),
                  }
                : {
                    status: "error",
                    activity: undefined,
                    content: "That didn't finish. Try again.",
                  },
            );
          } catch {
            if (run.stopped) return;
            patch(replyId, () => ({
              status: "error",
              activity: undefined,
              content: "The connection dropped. Try again.",
            }));
          }
        }
      } finally {
        if (!run.stopped)
          patch(replyId, (message) =>
            message.status === "pending" ? { status: "success" } : {},
          );
        if (active.current === run && !run.stopped) {
          active.current = null;
          sending.current = false;
          setBusy(false);
        }
      }
    },
    [messages, options.model, options.provider, patch],
  );

  const reset = useCallback(() => {
    setMessages([]);
    started.current = false;
  }, []);

  return { messages, busy, send, stop, reset };
}
