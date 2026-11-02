import {
  boundAgentHistory,
  historyData,
  isVisibleTool,
  type AgentEvent,
  type AgentHistoryEvent,
  type AgentHistoryMessage,
  type AgentReply,
} from "@hypa/intelligence-core/agent-stream";

export interface ConversationMessage extends AgentReply {
  role: "user" | "assistant";
  images?: string[];
  audio?: { name: string; mime: string; data: string }[];
  trace?: AgentHistoryEvent[];
}

export function appendHistoryEvent(
  trace: AgentHistoryEvent[],
  event: AgentEvent,
): AgentHistoryEvent[] {
  if (event.type === "delta") {
    const last = trace.at(-1);

    return last?.type === "delta"
      ? [...trace.slice(0, -1), { type: "delta", text: last.text + event.text }]
      : [...trace, { type: "delta", text: event.text }];
  }
  if (event.type === "tool_call" && isVisibleTool(event.name)) {
    return [
      ...trace,
      {
        type: "tool_call",
        id: event.id,
        name: event.name,
        args: historyData(event.args) as Record<string, unknown>,
      },
    ];
  }
  if (event.type === "tool_result" && isVisibleTool(event.name)) {
    return [
      ...trace,
      {
        type: "tool_result",
        id: event.id,
        name: event.name,
        ok: event.ok,
        ...(event.result !== undefined
          ? { result: historyData(event.result) }
          : {}),
        ...(event.error ? { error: event.error } : {}),
      },
    ];
  }
  if (event.type === "error")
    return [
      ...trace,
      { type: "error", code: event.code, message: event.message },
    ];

  return trace;
}

/** Recording names in the order the server numbers them: the history it is sent, then this message's files. */
export function audioNamesFor(
  history: AgentHistoryMessage[],
  files: { kind: string; name: string }[] = [],
): string[] {
  return [
    ...history.flatMap((entry) =>
      entry.role === "user" ? (entry.audio ?? []).map((file) => file.name) : [],
    ),
    ...files.filter((file) => file.kind === "audio").map((file) => file.name),
  ];
}

/** Pending turns never become history, and every request contains complete pairs. */
export function conversationHistory(
  messages: ConversationMessage[],
): AgentHistoryMessage[] {
  const history: AgentHistoryMessage[] = [];

  for (let index = 0; index < messages.length - 1; index += 2) {
    const user = messages[index];
    const assistant = messages[index + 1];

    if (
      user.role !== "user" ||
      assistant.role !== "assistant" ||
      assistant.status === "pending"
    )
      continue;
    history.push({
      role: "user",
      content: user.content,
      ...(user.images?.length ? { images: user.images } : {}),
      // A failed turn is not resent with its recordings; a file that broke it must not break the next message.
      ...(user.audio?.length && assistant.status !== "error"
        ? {
            audio: user.audio.map(({ name, mime, data }) => ({
              name,
              mime,
              data,
            })),
          }
        : {}),
    });
    const trace = assistant.trace ?? [];
    const failure =
      assistant.status === "error" &&
      !trace.some((event) => event.type === "error")
        ? [
            {
              type: "error" as const,
              code: "request_failed",
              message: assistant.content,
            },
          ]
        : [];

    history.push({
      role: "assistant",
      content: assistant.content,
      trace: [...trace, ...failure],
    });
  }

  return boundAgentHistory(history);
}
