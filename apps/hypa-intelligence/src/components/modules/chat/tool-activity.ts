import {
  toolLabels,
  type AgentAudioClip,
  type AgentStep,
} from "@hypa/intelligence-core/agent-stream";

/** Names a clip from the tool that made it, such as "French · Adaugo". */
export function clipLabel(
  clip: AgentAudioClip,
  steps: AgentStep[] | undefined,
  index: number,
) {
  const args = steps?.find((step) => step.id === clip.toolCallId)?.args as
    | Record<string, unknown>
    | undefined;
  const parts = [args?.language ?? args?.targetLang, args?.voice].filter(
    (part): part is string => typeof part === "string" && part !== "",
  );

  return parts.length ? parts.join(" · ") : `Audio ${index + 1}`;
}

export function stepStatus(step: AgentStep, pending: boolean) {
  return step.status === "running" && !pending ? "interrupted" : step.status;
}

export function completedToolLabel(step: AgentStep) {
  return step.name === "text_to_speech" ? "Created audio" : step.label;
}

/** A line in the step list. When the model picked an attached recording, the line names it. */
export function stepTitle(
  step: AgentStep,
  status: ReturnType<typeof stepStatus>,
  audioNames: string[] = [],
) {
  const number = (step.args as { attachedAudio?: unknown } | undefined)
    ?.attachedAudio;
  const name =
    (step.name === "speech_to_text" || step.name === "process_voice_message") &&
    typeof number === "number"
      ? audioNames[number - 1]
      : undefined;

  if (name) {
    return status === "ok"
      ? `Transcribed ${name}`
      : status === "running"
        ? `Transcribing ${name}…`
        : `Couldn't transcribe ${name}.`;
  }

  return status === "ok"
    ? completedToolLabel(step)
    : status === "running"
      ? `${toolLabels(step.name).running}…`
      : toolLabels(step.name).failed;
}

/** A finished summary names this many tools, then counts the rest. */
const TITLE_TOOLS = 3;

export function activitySummary(steps: AgentStep[], pending: boolean) {
  const running = steps.filter(
    (step) => stepStatus(step, pending) === "running",
  );
  const failed = steps.filter((step) => stepStatus(step, pending) === "failed");
  const stopped = steps.filter(
    (step) => stepStatus(step, pending) === "interrupted",
  );
  const completed = steps.filter((step) => step.status === "ok").length;
  const hasProblems = failed.length + stopped.length > 0;
  const done = [...new Set(steps.map(completedToolLabel))];
  const title = running.length
    ? `${toolLabels(running[0].name).running}${running.length > 1 ? ` + ${running.length - 1} more` : ""}…`
    : hasProblems
      ? `${completed ? `${completed} completed · ` : ""}${failed.length ? `${failed.length} failed` : ""}${failed.length && stopped.length ? " · " : ""}${stopped.length ? `${stopped.length} interrupted` : ""}`
      : pending
        ? "Thinking…"
        : `${done
            .slice(0, TITLE_TOOLS)
            .map((label, i) =>
              i ? label.charAt(0).toLowerCase() + label.slice(1) : label,
            )
            .join(
              ", ",
            )}${done.length > TITLE_TOOLS ? ` + ${done.length - TITLE_TOOLS} more` : ""}`;

  return { title, hasProblems, running: running.length };
}

/** Keep media metadata readable without rendering binary payloads or signed media URLs. */
export function readableToolData(value: unknown): unknown {
  if (typeof value === "string" && /^(data:|blob:)/.test(value))
    return "[media omitted]";
  if (Array.isArray(value)) return value.map(readableToolData);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /^(audioBase64|audio_b64|data|audio|image|audioUrl|audio_url|url)$/i.test(
          key,
        ) && typeof item === "string"
          ? "[media omitted]"
          : readableToolData(item),
      ]),
    );
  }

  return value;
}

export function resultPreview(
  step: AgentStep,
  pending: boolean,
): string | undefined {
  const status = stepStatus(step, pending);

  if (status === "running") return undefined;
  if (status === "interrupted")
    return "The response ended before this tool returned a result.";
  if (status === "failed") {
    if (
      step.name.startsWith("translate_") &&
      /provider temporarily unavailable|workload is not stopped|model unavailable/i.test(
        step.detail ?? "",
      )
    )
      return "Translation provider unavailable. Please try again.";

    return step.detail || "The tool could not finish.";
  }

  return readableResult(readableToolData(step.result));
}

/** A one-line reading of a tool result. The raw `detail` dump is never shown. */
function readableResult(result: unknown): string | undefined {
  if (typeof result === "string") return result.slice(0, 240);
  if (!result || typeof result !== "object" || Array.isArray(result))
    return undefined;
  const fields = result as Record<string, unknown>;

  for (const key of ["translation", "transcript", "text", "definition"]) {
    if (typeof fields[key] === "string") return fields[key].slice(0, 240);
  }
  const firstDefinition = Array.isArray(fields.definitions)
    ? (fields.definitions[0] as { text?: unknown } | undefined)?.text
    : undefined;
  const meaning = fields.meaning ?? firstDefinition;

  if (typeof meaning === "string")
    return `${typeof fields.word === "string" ? `${fields.word}: ` : ""}${meaning}`.slice(
      0,
      240,
    );
  if (fields.result && typeof fields.result === "object") {
    const nested = readableResult(fields.result);

    if (nested) return nested;
  }
  if (fields.mime && String(fields.mime).startsWith("audio/"))
    return "Audio created";
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value))
      return `${value.length} ${key.replace(/_/g, " ")}`;
  }

  return undefined;
}
