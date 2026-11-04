import { covers, type LineShape, shapeQuad } from './overlay-geometry';
import { inset, overlaps } from './page-blocks';

/** A card shrinks only once the text under it is this much smaller (zooming out, not hand shake). */
export const SHRINK_RATIO = 0.25;
/** The card tint changes only after this many frames in a row disagree with it. */
export const PALETTE_SWITCH_FRAMES = 4;
/** OCR moving a card by less than this (in line heights) is jitter: the card stays put. */
const DEAD_ZONE = 0.25;
const DEAD_ANGLE = 1.5;
/** A card that is only a skeleton must be read in this many separate OCR passes before it is drawn. */
export const APPEAR_PASSES = 2;
/** A drawn card the OCR stops reporting stays this long (ms), so one missed pass doesn't blink it out. */
export const CARD_HOLD_MS = 600;
const PALETTE_DRIFT = 18;
/** Cards are always light paper with dark ink, whatever the camera samples. */
const MIN_CARD_LUMA = 215;
const CARD_FALLBACK = '#efefec';
const INK = '#1f1f1f';

export type Palette = { background: string; color: string };
/** What settle() needs to know about a card. */
export type SettleCard = LineShape & { key: string; lineHeight: number; segments: { text?: string }[] };
type Settled = { card: SettleCard; order: number; passes: number; lastPass: number; lastAt: number };
type Observed = { background: string; color: string; id?: number };
type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => {
  const value = Number.parseInt(hex.replace('#', '').slice(0, 6), 16) || 0;
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const toHex = (rgb: Rgb) => `#${rgb.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;
const luma = ([r, g, b]: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;

/** Grows at once so text never peeks out; shrinks only on a real change in size. */
export function holdSize(shown: number | undefined, next: number, ratio = SHRINK_RATIO) {
  if (!shown || next >= shown) return next;
  return (shown - next) / shown > ratio ? next : shown;
}

/**
 * The card colour for a page: the paper tone the camera sees, lifted to a light card so it is never
 * dark, with dark ink. Lines sampled inverted (ink read as paper) are flipped before the median.
 */
export function cardPalette(lines: Observed[]): Palette | null {
  if (!lines.length) return null;
  const papers = lines.map((line) => {
    const bg = toRgb(line.background);
    const fg = toRgb(line.color);
    return luma(bg) >= luma(fg) ? bg : fg;
  });
  const paper: Rgb = [0, 1, 2].map((i) => median(papers.map((p) => p[i]))) as Rgb;
  const light = luma(paper);
  if (light < 120) return { background: CARD_FALLBACK, color: INK };
  // Lift towards white until the card is light, keeping the paper's tint.
  const lift = light >= MIN_CARD_LUMA ? 0 : (MIN_CARD_LUMA - light) / (255 - light);
  const card = paper.map((c) => c + (255 - c) * lift) as Rgb;
  // Keep the tint subtle: blend with neutral grey of the same lightness.
  const grey = luma(card);
  return { background: toHex(card.map((c) => grey + (c - grey) * 0.5) as Rgb), color: INK };
}

/**
 * Keeps cards steady and consistent while the phone moves: one locked palette, translations that
 * only change when a new one arrives, and card geometry that ignores OCR jitter.
 * Everything resets on a new target language or clear().
 */
export class StickyOverlay {
  private shapes = new Map<string, LineShape>();
  private texts = new Map<string, string>();
  private byLine = new Map<number, string>();
  private target?: string;
  private palette: Palette | null = null;
  private disagreeing = 0;
  private settled = new Map<string, Settled>();
  private order = 0;
  private translatedOnce = false;
  private initial = new Set<number>();

  clear() {
    this.translatedOnce = false;
    this.initial.clear();
    this.settled.clear();
    this.shapes.clear();
    this.texts.clear();
    this.byLine.clear();
    this.palette = null;
    this.disagreeing = 0;
  }

  /** Forget everything shown in another language. Call before text() on each pass. */
  retarget(target: string) {
    if (target === this.target) return;
    this.translatedOnce = false;
    this.initial.clear();
    this.settled.clear();
    this.shapes.clear();
    this.texts.clear();
    this.byLine.clear();
    this.target = target;
  }

  begin(target: string, observed: Observed[], liveShapes: string[], liveSegments: string[]) {
    this.retarget(target);
    const live = new Set(liveShapes);
    for (const key of this.shapes.keys()) if (!live.has(key)) this.shapes.delete(key);
    const segments = new Set(liveSegments);
    for (const key of this.texts.keys()) if (!segments.has(key)) this.texts.delete(key);
    const lines = new Set(observed.flatMap((line) => (line.id === undefined ? [] : [line.id])));
    for (const id of this.byLine.keys()) if (!lines.has(id)) this.byLine.delete(id);

    const seen = cardPalette(observed);
    if (!seen) return;
    if (!this.palette) {
      this.palette = seen;
      return;
    }
    const [a, b] = [toRgb(this.palette.background), toRgb(seen.background)];
    const drift = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    this.disagreeing = drift > PALETTE_DRIFT ? this.disagreeing + 1 : 0;
    if (this.disagreeing >= PALETTE_SWITCH_FRAMES) {
      this.palette = seen;
      this.disagreeing = 0;
    }
  }

  get colors(): Palette {
    return this.palette ?? { background: CARD_FALLBACK, color: INK };
  }

  /**
   * The translation to show for a segment: the newest one, or the last one shown. When a segment is
   * re-formed (a line joined or left), it keeps the translation one of its lines showed until a new one arrives.
   */
  text(segment: string, fresh: string | undefined, lineIds: number[] = []) {
    const shown = fresh ?? this.texts.get(segment) ?? lineIds.map((id) => this.byLine.get(id)).find(Boolean);
    if (!shown) return undefined;
    this.translatedOnce = true;
    this.texts.set(segment, shown);
    for (const id of lineIds) this.byLine.set(id, shown);
    return shown;
  }

  /** Call once per pass, before text(): remembers which lines were on screen before anything was translated. */
  noteLines(ids: number[]) {
    if (!this.translatedOnce) for (const id of ids) this.initial.add(id);
  }

  /**
   * The loading skeleton plays once: for the lines that were there when Lens started (or the language
   * changed). After the first translation shows, new text simply appears when its translation arrives.
   */
  mayLoad(lineId: number) {
    return !this.translatedOnce || this.initial.has(lineId);
  }

  /** The card shape to draw: follows real moves, ignores jitter, grows at once, shrinks reluctantly. */
  place(key: string, next: LineShape, lineHeight: number): LineShape {
    const shown = this.shapes.get(key);
    if (!shown) {
      this.shapes.set(key, next);
      return next;
    }
    const moved = Math.hypot(next.centerX - shown.centerX, next.centerY - shown.centerY);
    const turned = Math.abs(wrap(next.angle - shown.angle));
    const still = moved < DEAD_ZONE * lineHeight && turned < DEAD_ANGLE;
    const length = holdSize(shown.length, next.length);
    const thickness = holdSize(shown.thickness, next.thickness);
    // A card that grew (a line joined) re-centres; otherwise it would spill past one side.
    const resized = length !== shown.length || thickness !== shown.thickness;
    const placed: LineShape = still && !resized
      ? { ...shown, length, thickness }
      : { ...next, length, thickness };
    this.shapes.set(key, placed);
    return placed;
  }

  /**
   * Decides which of this pass's cards are actually drawn, so the overlay is the same from one
   * moment to the next instead of mirroring every OCR wobble:
   * - a skeleton appears only once it has been read in APPEAR_PASSES separate passes (a translated card is already confirmed);
   * - a drawn card the OCR stops reporting is kept for CARD_HOLD_MS, unless a live card now covers it;
   * - cards never overlap: translated ones win, then the longest-standing one.
   */
  settle<T extends SettleCard>(cards: T[], pass: number, now: number): T[] {
    const live = new Set<string>();
    for (const card of cards) {
      live.add(card.key);
      const known = this.settled.get(card.key);
      if (!known) {
        this.settled.set(card.key, { card, order: this.order++, passes: 1, lastPass: pass, lastAt: now });
        continue;
      }
      if (known.lastPass !== pass) {
        known.passes += 1;
        known.lastPass = pass;
      }
      known.card = card;
      known.lastAt = now;
    }

    const wanted: Settled[] = [];
    for (const [key, entry] of this.settled) {
      if (!live.has(key)) {
        if (now - entry.lastAt > CARD_HOLD_MS || cards.some((card) => covers(card, entry.card))) {
          this.settled.delete(key);
          continue;
        }
      }
      const translated = entry.card.segments.some((segment) => segment.text);
      if (translated || entry.passes >= APPEAR_PASSES) wanted.push(entry);
    }

    const rank = (entry: Settled) => (entry.card.segments.some((segment) => segment.text) ? 0 : 1);
    wanted.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
    const drawn: { entry: Settled; quad: ReturnType<typeof shapeQuad> }[] = [];
    for (const entry of wanted) {
      const quad = inset(shapeQuad(entry.card), entry.card.lineHeight * 0.1);
      if (drawn.some((other) => overlaps(other.quad, quad))) continue;
      drawn.push({ entry, quad });
    }
    return drawn.map(({ entry }) => entry.card as T);
  }
}
