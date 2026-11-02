import { z } from "zod";

export const MAX_HISTORY_MESSAGES = 100;
export const MAX_HISTORY_CHARS = 1_000_000;

const id = z.string().min(1).max(200);
const tool = z.string().min(1).max(100);
const traceEvent = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("delta"), text: z.string().max(100_000) })
    .strict(),
  z
    .object({
      type: z.literal("tool_call"),
      id,
      name: tool,
      args: z.record(z.unknown()),
    })
    .strict(),
  z
    .object({
      type: z.literal("tool_result"),
      id,
      name: tool,
      ok: z.boolean(),
      result: z.unknown().optional(),
      error: z.string().max(10_000).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      code: z.string().max(100),
      message: z.string().max(10_000),
    })
    .strict(),
]);

export type AgentHistoryEvent = z.infer<typeof traceEvent>;

const message = z.discriminatedUnion("role", [
  z
    .object({
      role: z.literal("user"),
      content: z.string().max(100_000),
      images: z
        .array(
          z
            .string()
            .max(7_000_000)
            .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/),
        )
        .max(4)
        .optional(),
      /** Voice notes and audio files, kept so a later message can ask for them by number. */
      audio: z
        .array(
          z
            .object({
              name: z.string().min(1).max(255),
              mime: z.string().regex(/^audio\/[a-z0-9.+-]+$/),
              data: z
                .string()
                .max(7_000_000)
                .regex(/^[A-Za-z0-9+/]+=*$/),
            })
            .strict(),
        )
        .max(4)
        .optional(),
    })
    .strict(),
  z
    .object({
      role: z.literal("assistant"),
      content: z.string().max(100_000),
      trace: z.array(traceEvent).max(1000).optional(),
    })
    .strict(),
]);

export type AgentHistoryMessage = z.infer<typeof message>;

export const agentHistorySchema = z
  .array(message)
  .max(MAX_HISTORY_MESSAGES)
  .superRefine((messages, ctx) => {
    if (JSON.stringify(messages).length > MAX_HISTORY_CHARS)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conversation context is too large.",
      });
    messages.forEach((entry, index) => {
      if (entry.role !== (index % 2 === 0 ? "user" : "assistant"))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Conversation context must contain complete user/assistant turns.",
        });
    });
    if (messages.length % 2 !== 0)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conversation context must end with an assistant reply.",
      });
  });

/** Preserve structured results without resending audio or base64 tool arguments. */
export function historyData(value: unknown): unknown {
  if (typeof value === "string" && /^(data:|blob:)/.test(value))
    return "[media omitted]";
  if (Array.isArray(value)) return value.map(historyData);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(audioBase64|audio_b64|data|audio|image)$/i.test(key) &&
        typeof item === "string"
          ? "[media omitted]"
          : historyData(item),
      ]),
    );
  }
  return value;
}

/** Keep complete recent turns within transport bounds; model context fitting happens on the server. */
export function boundAgentHistory(
  messages: AgentHistoryMessage[],
): AgentHistoryMessage[] {
  const recent: AgentHistoryMessage[] = [];
  for (
    let index = Math.max(0, messages.length - MAX_HISTORY_MESSAGES);
    index < messages.length - 1;
    index += 2
  ) {
    const user = message.safeParse(messages[index]);
    const assistant = message.safeParse(messages[index + 1]);
    if (
      user.success &&
      user.data.role === "user" &&
      assistant.success &&
      assistant.data.role === "assistant"
    )
      recent.push(user.data, assistant.data);
  }
  while (recent.length && JSON.stringify(recent).length > MAX_HISTORY_CHARS) {
    // Large images and audio should not discard otherwise usable text and tool context.
    const mediaMessage = recent.find(
      (entry) =>
        entry.role === "user" && (entry.images?.length || entry.audio?.length),
    );
    if (mediaMessage?.role === "user") {
      const index = recent.indexOf(mediaMessage);
      recent[index] = {
        role: "user",
        content: `${mediaMessage.content.slice(0, 99_900)}\n[Earlier attachments omitted to fit conversation context.]`,
      };
    } else recent.splice(0, 2);
  }
  return recent;
}
