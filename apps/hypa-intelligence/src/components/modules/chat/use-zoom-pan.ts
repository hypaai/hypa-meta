import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

const MAX_SCALE = 5;
const BUTTON_STEP = 1.5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 8;
const SWIPE_PX = 60;
const KEY_PAN_PX = 80;

interface View {
  scale: number;
  x: number;
  y: number;
}

const HOME: View = { scale: 1, x: 0, y: 0 };

/**
 * Zoom and pan for one image inside a stage: wheel and trackpad pinch, touch pinch, drag to pan,
 * double tap or click, keys and buttons. At 1x a one-finger drag swipes to the next picture instead.
 * `resetKey` returns to 1x when the picture changes.
 */
export function useZoomPan({
  stage,
  image,
  resetKey,
  onSwipe,
}: {
  stage: RefObject<HTMLElement | null>;
  image: RefObject<HTMLElement | null>;
  resetKey: unknown;
  onSwipe: (direction: -1 | 1) => void;
}) {
  const [view, setViewState] = useState<View>(HOME);
  const [gesturing, setGesturing] = useState(false);
  const current = useRef<View>(HOME);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const tap = useRef({ x: 0, y: 0, at: 0, moved: false });
  const lastTap = useRef({ x: 0, y: 0, at: 0 });

  const setView = useCallback((next: View) => {
    current.current = next;
    setViewState(next);
  }, []);

  // A fresh picture starts at 1x, before it is painted.
  useLayoutEffect(() => {
    setView(HOME);
  }, [resetKey, setView]);

  const clamp = useCallback(
    (next: View): View => {
      const box = stage.current?.getBoundingClientRect();
      const element = image.current;

      if (!box || !element) return HOME;
      const limitX = Math.max(
        0,
        (element.offsetWidth * next.scale - box.width) / 2,
      );
      const limitY = Math.max(
        0,
        (element.offsetHeight * next.scale - box.height) / 2,
      );

      return {
        scale: next.scale,
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [stage, image],
  );

  /** Zooms so the point under (clientX, clientY) stays put. */
  const zoomAt = useCallback(
    (scale: number, clientX: number, clientY: number) => {
      const box = stage.current?.getBoundingClientRect();

      if (!box) return;
      const next = Math.min(MAX_SCALE, Math.max(1, scale));
      const px = clientX - (box.left + box.width / 2);
      const py = clientY - (box.top + box.height / 2);
      const ratio = next / current.current.scale;

      setView(
        clamp({
          scale: next,
          x: px - (px - current.current.x) * ratio,
          y: py - (py - current.current.y) * ratio,
        }),
      );
    },
    [stage, clamp, setView],
  );

  const zoomFromCenter = useCallback(
    (factor: number) => {
      const box = stage.current?.getBoundingClientRect();

      if (box)
        zoomAt(
          current.current.scale * factor,
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
    },
    [stage, zoomAt],
  );

  // Wheel needs a non-passive listener to keep the page from scrolling behind the viewer.
  useEffect(() => {
    const element = stage.current;

    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setGesturing(false);
      zoomAt(
        current.current.scale *
          Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)),
        event.clientX,
        event.clientY,
      );
    };

    element.addEventListener("wheel", wheel, { passive: false });

    return () => element.removeEventListener("wheel", wheel);
  }, [stage, zoomAt]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured.
    }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setGesturing(true);
    if (pointers.current.size === 1) {
      tap.current = {
        x: event.clientX,
        y: event.clientY,
        at: Date.now(),
        moved: false,
      };
    } else {
      tap.current.moved = true;
      const [a, b] = [...pointers.current.values()];

      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: current.current.scale,
      };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const before = pointers.current.get(event.pointerId);

    if (!before) return;
    const after = { x: event.clientX, y: event.clientY };

    pointers.current.set(event.pointerId, after);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;

      zoomAt(
        pinch.current.scale * (distance / pinch.current.distance),
        centerX,
        centerY,
      );
      // Two fingers moving together also pan.
      const moveX = (after.x - before.x) / 2;
      const moveY = (after.y - before.y) / 2;

      setView(
        clamp({
          ...current.current,
          x: current.current.x + moveX,
          y: current.current.y + moveY,
        }),
      );

      return;
    }
    if (
      Math.hypot(after.x - tap.current.x, after.y - tap.current.y) > TAP_SLOP_PX
    )
      tap.current.moved = true;
    const dx = after.x - before.x;
    const dy = after.y - before.y;

    if (current.current.scale > 1) {
      setView(
        clamp({
          ...current.current,
          x: current.current.x + dx,
          y: current.current.y + dy,
        }),
      );
    } else if (event.pointerType !== "mouse") {
      // At 1x the picture follows the finger sideways, ready to swipe to the next one.
      setView({ ...HOME, x: current.current.x + dx });
    }
  };

  const release = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    if (!pointers.current.delete(event.pointerId)) return;
    pinch.current = null;
    if (pointers.current.size > 0) return;
    setGesturing(false);
    const { x, scale } = current.current;

    if (scale < 1.05) {
      if (Math.abs(x) > SWIPE_PX && !cancelled) onSwipe(x > 0 ? -1 : 1);
      setView(HOME);
    }
    if (
      cancelled ||
      tap.current.moved ||
      Date.now() - tap.current.at > DOUBLE_TAP_MS
    )
      return;
    // Two quick taps in the same place toggle between 1x and a closer look.
    const now = Date.now();
    const again =
      now - lastTap.current.at < DOUBLE_TAP_MS &&
      Math.hypot(
        event.clientX - lastTap.current.x,
        event.clientY - lastTap.current.y,
      ) <
        TAP_SLOP_PX * 4;

    lastTap.current = again
      ? { x: 0, y: 0, at: 0 }
      : { x: event.clientX, y: event.clientY, at: now };
    if (again)
      zoomAt(
        current.current.scale > 1 ? 1 : DOUBLE_TAP_SCALE,
        event.clientX,
        event.clientY,
      );
  };

  /** Handles zoom keys, and arrow keys while zoomed. Returns false when the key is not for zooming. */
  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (event.key === "+" || event.key === "=") zoomFromCenter(BUTTON_STEP);
    else if (event.key === "-") zoomFromCenter(1 / BUTTON_STEP);
    else if (event.key === "0") setView(HOME);
    else if (current.current.scale > 1 && event.key.startsWith("Arrow")) {
      const { x, y, scale } = current.current;
      const by = {
        ArrowLeft: [KEY_PAN_PX, 0],
        ArrowRight: [-KEY_PAN_PX, 0],
        ArrowUp: [0, KEY_PAN_PX],
        ArrowDown: [0, -KEY_PAN_PX],
      }[event.key] ?? [0, 0];

      setView(clamp({ scale, x: x + by[0], y: y + by[1] }));
    } else return false;

    return true;
  };

  return {
    scale: view.scale,
    gesturing,
    style: {
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
    },
    zoomIn: () => zoomFromCenter(BUTTON_STEP),
    zoomOut: () => zoomFromCenter(1 / BUTTON_STEP),
    reset: () => setView(HOME),
    onKeyDown,
    stageProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => release(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) =>
        release(event, true),
    },
  };
}
