import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useZoomPan } from "./use-zoom-pan";

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
const SHOWN = 4;

/** How the first four pictures sit: the grid adapts to the count and to the screen width. */
const LAYOUT: Record<number, { grid: string; tiles: string[] }> = {
  1: { grid: "max-w-md grid-cols-1", tiles: ["aspect-[4/3]"] },
  2: {
    grid: "max-w-xl grid-cols-2",
    tiles: ["aspect-square sm:aspect-[4/3]", "aspect-square sm:aspect-[4/3]"],
  },
  3: {
    grid: "max-w-xl grid-cols-2 sm:aspect-[3/2] sm:grid-cols-[1.4fr_1fr] sm:grid-rows-2",
    tiles: [
      "col-span-2 aspect-[3/2] sm:col-span-1 sm:row-span-2 sm:aspect-auto",
      "aspect-square sm:aspect-auto",
      "aspect-square sm:aspect-auto",
    ],
  },
  4: {
    grid: "max-w-xl grid-cols-2",
    tiles: Array(4).fill("aspect-square sm:aspect-[4/3]"),
  },
};

function Tile({
  url,
  index,
  className,
  more,
  onOpen,
}: {
  url: string;
  index: number;
  className: string;
  more: number;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      aria-label={
        more
          ? `Open picture ${index + 1}, and ${more} more`
          : `Open picture ${index + 1}`
      }
      className={`group relative min-h-0 overflow-hidden rounded-xl bg-[var(--muted)] ${loaded ? "" : "animate-pulse motion-reduce:animate-none"} ${className} ${focus}`}
      type="button"
      onClick={onOpen}
    >
      <img
        alt={`Generated artwork ${index + 1}`}
        className={`size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
        decoding="async"
        loading="lazy"
        src={url}
        onLoad={() => setLoaded(true)}
      />
      <span
        aria-hidden="true"
        className="absolute top-2 right-2 grid size-7 place-items-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        <Maximize2 className="size-3.5" />
      </span>
      {more > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-semibold text-white"
        >
          +{more}
        </span>
      )}
    </button>
  );
}

export function ImageViewer({
  urls,
  start,
  onClose,
  imageLabel = "Generated artwork",
}: {
  urls: string[];
  start: number;
  onClose: () => void;
  imageLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [index, setIndex] = useState(start);
  const step = (by: number) =>
    setIndex((current) => (current + by + urls.length) % urls.length);
  const zoom = useZoomPan({
    stage,
    image,
    resetKey: index,
    onSwipe: (direction) => urls.length > 1 && step(direction),
  });
  const zoomed = zoom.scale > 1;
  const control = `grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-white/10 ${focus}`;

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label="Picture viewer"
      className="m-0 size-full max-h-none max-w-none bg-transparent p-0 text-white backdrop:bg-black"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (zoom.onKeyDown(event)) {
          event.preventDefault();

          return;
        }
        if (event.key === "ArrowLeft") step(-1);
        if (event.key === "ArrowRight") step(1);
      }}
    >
      <div
        className="flex size-full flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs tabular-nums">
            {index + 1} / {urls.length}
          </span>
          <div className="flex gap-2">
            <a
              download
              aria-label="Download picture"
              className={control}
              href={urls[index]}
              rel="noreferrer"
              target="_blank"
            >
              <Download className="size-4" />
            </a>
            <button
              aria-label="Close viewer"
              className={control}
              type="button"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div
          ref={stage}
          className={`relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-3 pb-4 select-none sm:px-16 ${zoomed ? (zoom.gesturing ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
          {...zoom.stageProps}
        >
          <img
            key={index}
            ref={image}
            alt={`${imageLabel} ${index + 1} of ${urls.length}`}
            className={`max-h-full max-w-full rounded-xl object-contain will-change-transform ${zoom.gesturing ? "" : "transition-transform duration-200 ease-out motion-reduce:transition-none"}`}
            draggable={false}
            src={urls[index]}
            style={zoom.style}
          />
          {urls.length > 1 && (
            <>
              <button
                aria-label="Previous picture"
                className={`absolute left-2 hidden size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid ${focus}`}
                type="button"
                onClick={() => step(-1)}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                aria-label="Next picture"
                className={`absolute right-2 hidden size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid ${focus}`}
                type="button"
                onClick={() => step(1)}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          <div
            aria-label="Zoom"
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 p-1 backdrop-blur"
            role="group"
          >
            <button
              aria-label="Zoom out"
              className={control}
              disabled={zoom.scale <= 1}
              type="button"
              onClick={zoom.zoomOut}
            >
              <ZoomOut className="size-4" />
            </button>
            <button
              aria-label="Reset zoom"
              className={`min-w-12 rounded-full px-2 text-xs tabular-nums hover:bg-white/10 ${focus}`}
              disabled={!zoomed}
              type="button"
              onClick={zoom.reset}
            >
              {Math.round(zoom.scale * 100)}%
            </button>
            <button
              aria-label="Zoom in"
              className={control}
              disabled={zoom.scale >= 5}
              type="button"
              onClick={zoom.zoomIn}
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** Pictures an agent reply made: an adaptive mosaic, and a full-screen viewer with swipe and arrows. */
export function ImageGallery({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const shown = urls.slice(0, SHOWN);
  const layout = LAYOUT[shown.length];

  if (!layout) return null;

  return (
    <>
      <div
        aria-label="Generated pictures"
        className={`mt-3 grid w-full gap-1.5 ${layout.grid}`}
        role="group"
      >
        {shown.map((url, index) => (
          <Tile
            key={url.slice(-24) + index}
            className={layout.tiles[index]}
            index={index}
            more={index === SHOWN - 1 ? urls.length - SHOWN : 0}
            url={url}
            onOpen={() => setOpen(index)}
          />
        ))}
      </div>
      {open !== null && (
        <ImageViewer start={open} urls={urls} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
