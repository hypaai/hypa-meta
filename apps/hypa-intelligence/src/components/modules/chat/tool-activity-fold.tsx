import type { AgentStep } from "@hypa/intelligence-core/agent-stream";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";

import {
  activitySummary,
  resultPreview,
  stepStatus,
  stepTitle,
} from "./tool-activity";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

function ToolStep({
  step,
  pending,
  audioNames,
}: {
  step: AgentStep;
  pending: boolean;
  audioNames: string[];
}) {
  const status = stepStatus(step, pending);
  const problem = status === "failed" || status === "interrupted";
  const preview = resultPreview(step, pending);

  return (
    <li
      className={`relative py-1 before:absolute before:-left-4 before:top-2.5 before:size-1.5 before:rounded-full ${problem ? "before:bg-[var(--destructive)]" : "before:bg-[var(--muted-foreground)]"} ${status === "running" ? "before:animate-pulse motion-reduce:before:animate-none" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className={status === "running" ? "tool-shimmer" : undefined}>
          {stepTitle(step, status, audioNames)}
        </span>
      </div>
      {preview && (
        <p
          className={`line-clamp-2 text-xs [overflow-wrap:anywhere] ${problem ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}
        >
          {preview}
        </p>
      )}
      {status === "failed" && step.detail && step.detail !== preview && (
        <details className="mt-1 text-xs text-[var(--muted-foreground)]">
          <summary className={`w-fit cursor-pointer rounded-sm ${focus}`}>
            Details
          </summary>
          <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
            {step.detail}
          </p>
        </details>
      )}
    </li>
  );
}

/** Hides content from focus and screen readers while it is folded away. React 18 has no `inert` prop. */
const inert = (hidden: boolean) =>
  hidden ? ({ inert: "" } as Record<string, string>) : {};

const row =
  "flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md text-left text-[var(--muted-foreground)]";

export function ToolActivityFold({
  steps,
  pending,
  activity,
  audioNames,
}: {
  steps: AgentStep[];
  pending: boolean;
  /** Every recording in the chat, in order, so a step can name the one it heard. */
  audioNames: string[];
  /** What the turn is doing before any tool starts, such as "Reconnecting". */
  activity?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary = activitySummary(steps, pending);
  const contentId = useId();
  const live = summary.running > 0 || pending;
  const expandable = steps.length > 0;
  // Before the first tool the line only says what is happening; it folds away if no tool ever runs.
  const visible = expandable || pending;
  const title = expandable || !activity ? summary.title : `${activity}…`;
  const header = (
    <>
      {live && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--primary)] motion-reduce:animate-none"
        />
      )}
      <span
        className={`min-w-0 flex-1 truncate ${live ? "tool-shimmer" : summary.hasProblems ? "text-[var(--destructive)]" : ""}`}
        role="status"
      >
        {title}
      </span>
      {expandable && !live && (
        <span className="shrink-0 text-[11px] tabular-nums">
          {steps.length} {steps.length === 1 ? "step" : "steps"}
        </span>
      )}
      {expandable && (
        <ChevronRight
          aria-hidden="true"
          className={`size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
        />
      )}
    </>
  );

  return (
    <section
      aria-label="Tool activity"
      className={`grid w-full min-w-0 text-xs transition-[grid-template-rows,opacity,margin] duration-200 ease-out motion-reduce:transition-none ${visible ? "mb-3 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0"}`}
      {...inert(!visible)}
    >
      <div className="min-h-0 overflow-hidden">
        {expandable ? (
          <button
            aria-controls={contentId}
            aria-expanded={open}
            aria-label={summary.title}
            className={`${row} ${focus}`}
            type="button"
            onClick={() => {
              setOpen((current) => !current);
            }}
          >
            {header}
          </button>
        ) : (
          <div className={row}>{header}</div>
        )}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${open && expandable ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          {...inert(!open || !expandable)}
        >
          <div className="min-h-0 overflow-hidden">
            <ol
              className="relative ml-0.5 list-none space-y-0.5 pt-1 pl-4 before:absolute before:top-3 before:bottom-2 before:left-[2.5px] before:w-px before:bg-[var(--border)]"
              id={contentId}
            >
              {steps.map((step) => (
                <ToolStep
                  key={step.id}
                  audioNames={audioNames}
                  pending={pending}
                  step={step}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
