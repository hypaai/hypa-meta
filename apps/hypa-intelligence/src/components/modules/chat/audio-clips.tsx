import type {
  AgentAudioClip,
  AgentStep,
} from "@hypa/intelligence-core/agent-stream";

import { useMemo, useRef, useState } from "react";
import { Download, Pause, Play } from "lucide-react";

import { pauseOtherAudio } from "./pause-other-audio";
import { clipLabel } from "./tool-activity";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
const BARS = 40;

export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** A steady decorative waveform for one clip; it is not decoded from the audio. */
export function barHeights(seed: string, count = BARS) {
  let state = [...seed].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );

  return Array.from({ length: count }, (_, index) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swell = 0.55 + 0.45 * Math.sin((index / count) * Math.PI);

    return 25 + Math.round((state / 2 ** 32) * 75 * swell);
  });
}

function ClipCard({ clip, label }: { clip: AgentAudioClip; label: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState((clip.durationMs ?? 0) / 1000);
  const bars = useMemo(
    () => barHeights(clip.id ?? clip.url.slice(-32)),
    [clip],
  );
  const progress = length > 0 ? time / length : 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-[var(--muted)] p-2.5 transition-shadow motion-reduce:transition-none ${playing ? "ring-1 ring-[var(--primary)]" : ""}`}
    >
      <audio
        ref={audio}
        preload="metadata"
        src={clip.url}
        onEnded={() => {
          setTime(0);
          setPlaying(false);
        }}
        onLoadedMetadata={(event) => {
          if (Number.isFinite(event.currentTarget.duration))
            setLength(event.currentTarget.duration);
        }}
        onPause={() => setPlaying(false)}
        onPlay={(event) => {
          setPlaying(true);
          pauseOtherAudio(event.currentTarget);
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
      >
        <track kind="captions" />
      </audio>
      <button
        aria-label={`${playing ? "Pause" : "Play"} ${label}`}
        className={`grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] ${focus}`}
        type="button"
        onClick={() =>
          playing ? audio.current?.pause() : void audio.current?.play()
        }
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
          {playing || time > 0 ? `${clock(time)} / ` : ""}
          {clock(length)}
        </p>
      </div>
      <div className="relative order-last h-8 basis-full sm:order-none sm:basis-auto sm:flex-1">
        <div
          aria-hidden="true"
          className="flex size-full items-center gap-[2px]"
        >
          {bars.map((height, index) => (
            <i
              key={index}
              className={`block min-w-px flex-1 rounded-full ${index / BARS < progress ? "bg-[var(--primary)]" : "bg-[color-mix(in_oklch,var(--foreground)_22%,transparent)]"}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <input
          aria-label={`Seek ${label}`}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          disabled={length <= 0}
          max={length}
          min={0}
          step={0.05}
          type="range"
          value={time}
          onChange={(event) => {
            const next = Number(event.target.value);

            if (audio.current) audio.current.currentTime = next;
            setTime(next);
          }}
        />
      </div>
      <a
        download
        aria-label={`Download ${label}`}
        className={`grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--secondary)] text-[var(--secondary-foreground)] ${focus}`}
        href={clip.url}
        rel="noreferrer"
        target="_blank"
      >
        <Download className="size-3.5" />
      </a>
    </div>
  );
}

/** Every clip an agent reply made, one player card each. Playing one pauses the others. */
export function AudioClips({
  clips,
  steps,
}: {
  clips: AgentAudioClip[];
  steps?: AgentStep[];
}) {
  return (
    <div
      aria-label="Audio clips"
      className="mt-3 w-full max-w-xl space-y-1.5"
      role="group"
    >
      {clips.map((clip, index) => (
        <ClipCard
          key={clip.id ?? clip.url.slice(-32)}
          clip={clip}
          label={clipLabel(clip, steps, index)}
        />
      ))}
    </div>
  );
}
