import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

const RESET_MS = 1800;

/**
 * The copy button and time under a message. The row always takes its space, so the chat does not
 * jump; its contents fade in on hover or keyboard focus, and stay visible on touch screens.
 */
export function MessageActions({
  text,
  timestamp,
  ready,
  isUser,
}: {
  text: string;
  timestamp?: string;
  ready: boolean;
  isUser: boolean;
}) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const date = timestamp ? new Date(timestamp) : null;
  const validDate = date && Number.isFinite(date.getTime()) ? date : null;
  const label = copied
    ? "Copied"
    : failed
      ? "Copy failed. Try again"
      : "Copy message";

  const copy = async () => {
    if (copying) return;
    clearTimeout(resetTimer.current);
    setCopying(true);
    setCopied(false);
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setFailed(true);
    } finally {
      setCopying(false);
    }
    resetTimer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, RESET_MS);
  };

  return (
    <div className="relative mt-[5px] h-[25px] w-full shrink-0">
      {ready && (
        <div
          className={`absolute inset-0 flex items-center gap-1.5 px-3 text-[var(--muted-foreground)] transition-opacity duration-150 group-hover/message:opacity-100 has-[:focus-visible]:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100 ${copying || copied || failed ? "opacity-100" : "opacity-0"} ${isUser ? "justify-end" : "justify-start"}`}
        >
          {text && (
            <button
              aria-label={label}
              className="flex size-[25px] shrink-0 items-center justify-center rounded-md transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              title={label}
              type="button"
              onClick={copy}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
            </button>
          )}
          {validDate && (
            <time
              className="text-[11px] whitespace-nowrap tabular-nums"
              dateTime={timestamp}
              title={`${isUser ? "Sent" : "Completed"} ${validDate.toLocaleString()}`}
            >
              {validDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
          <span aria-live="polite" className="sr-only" role="status">
            {copied ? "Message copied" : failed ? "Could not copy message" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
