import { Square, Trash2 } from "lucide-react";

import { barHeights } from "./audio-clips";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
const WAVE = barHeights("recording", 60);

/** Replaces the composer row while recording: cancel, timer, moving waveform, stop. */
export function RecordingBar({
  time,
  onCancel,
  onStop,
}: {
  time: string;
  onCancel: () => void;
  onStop: () => void;
}) {
  return (
    <div className="flex min-h-10 items-center gap-2.5" role="group">
      <button
        aria-label="Discard recording"
        className={`grid size-9 shrink-0 place-items-center rounded-xl text-[var(--muted-foreground)] hover:bg-[var(--muted)] ${focus}`}
        type="button"
        onClick={onCancel}
      >
        <Trash2 aria-hidden="true" className="size-[18px]" />
      </button>
      <span
        aria-hidden="true"
        className="size-2 shrink-0 animate-pulse rounded-full bg-[var(--destructive)] motion-reduce:animate-none"
      />
      <span
        aria-label="Recording time"
        className="text-[13px] font-medium tabular-nums"
        role="timer"
      >
        {time}
      </span>
      <div
        aria-hidden="true"
        className="flex h-8 min-w-0 flex-1 items-center overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_14%)]"
      >
        <div className="rec-wave flex w-max items-center gap-0.5">
          {[...WAVE, ...WAVE].map((height, index) => (
            <i
              key={index}
              className="block h-7 w-[3px] shrink-0 rounded-full bg-[var(--primary)] opacity-80"
              style={{ transform: `scaleY(${height / 100})` }}
            />
          ))}
        </div>
      </div>
      <button
        aria-label="Stop recording"
        className={`relative grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] ${focus}`}
        type="button"
        onClick={onStop}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-[var(--primary)] opacity-30 motion-reduce:animate-none"
        />
        <Square aria-hidden="true" className="relative size-3.5 fill-current" />
      </button>
    </div>
  );
}
