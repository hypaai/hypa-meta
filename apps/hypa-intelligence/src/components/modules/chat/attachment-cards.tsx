import { useMemo, useRef, useState } from "react";
import { Mic, Pause, Play, Plus, X } from "lucide-react";

import { barHeights, clock } from "./audio-clips";
import { pauseOtherAudio } from "./pause-other-audio";
import {
  fileSize,
  type AttachmentView,
  type ChatAttachment,
} from "./chat-attachments";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
const BARS = 22;

/** One attachment: a voice or audio file you can play, or an image. */
export function AttachmentCard({
  item,
  onOpen,
  onRemove,
}: {
  item: AttachmentView;
  onOpen?: () => void;
  onRemove?: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(item.seconds ?? 0);
  const bars = useMemo(() => barHeights(item.id, BARS), [item.id]);
  const isAudio = item.kind === "audio";
  const progress = length > 0 ? time / length : 0;

  return (
    <div className="relative flex min-w-40 max-w-56 flex-1 flex-col justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2">
      <div className="flex items-center gap-2 pr-5">
        {isAudio ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
            <Mic aria-hidden="true" className="size-4" />
          </span>
        ) : (
          <button
            aria-label={`Open ${item.name}`}
            className={`size-8 shrink-0 overflow-hidden rounded-lg ${focus}`}
            type="button"
            onClick={onOpen}
          >
            <img alt="" className="size-full object-cover" src={item.url} />
          </button>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{item.name}</p>
          <p className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
            {isAudio && length > 0
              ? `${playing || time > 0 ? `${clock(time)} / ` : ""}${clock(length)}`
              : fileSize(item.size)}
          </p>
        </div>
      </div>
      {isAudio && (
        <div className="flex items-center gap-2">
          <audio
            ref={audio}
            preload="metadata"
            src={item.url}
            onEnded={() => setTime(0)}
            onLoadedMetadata={(event) => {
              const { duration } = event.currentTarget;

              if (Number.isFinite(duration) && !item.seconds)
                setLength(duration);
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
            aria-label={`${playing ? "Pause" : "Play"} ${item.name}`}
            className={`grid size-6 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] ${focus}`}
            type="button"
            onClick={() =>
              playing ? audio.current?.pause() : void audio.current?.play()
            }
          >
            {playing ? (
              <Pause className="size-3" />
            ) : (
              <Play className="size-3" />
            )}
          </button>
          <div
            aria-hidden="true"
            className="flex h-5 min-w-0 flex-1 items-center gap-px"
          >
            {bars.map((height, index) => (
              <i
                key={index}
                className={`block min-w-px flex-1 rounded-full ${index / BARS < progress ? "bg-[var(--primary)]" : "bg-[color-mix(in_oklch,var(--foreground)_25%,transparent)]"}`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      )}
      {onRemove && (
        <button
          aria-label={`Remove ${item.name}`}
          className={`absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] ${focus}`}
          type="button"
          onClick={onRemove}
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </div>
  );
}

/** The cards in a composer, with a dashed card to add more while there is room. */
export function AttachmentRow({
  items,
  canAdd,
  onAdd,
  onOpen,
  onRemove,
}: {
  items: ChatAttachment[];
  canAdd: boolean;
  onAdd: () => void;
  onOpen: (image: ChatAttachment) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
      {items.map((item) => (
        <AttachmentCard
          key={item.id}
          item={item}
          onOpen={() => onOpen(item)}
          onRemove={() => onRemove(item.id)}
        />
      ))}
      {canAdd && (
        <button
          aria-label="Add another file"
          className={`grid w-14 shrink-0 place-items-center rounded-2xl border border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] ${focus}`}
          type="button"
          onClick={onAdd}
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
