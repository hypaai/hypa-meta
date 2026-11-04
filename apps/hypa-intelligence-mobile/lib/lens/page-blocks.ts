import type { Point } from './frame-points';
import type { Size } from './overlay-geometry';

/**
 * Turns tracked OCR lines into paragraph blocks, the way the text sits on the page:
 * lines of a paragraph share one card, wrapped lines become one translation segment,
 * and list items / headings / short last lines start a new segment.
 *
 * Works in upright image pixels (normalised corners x image size) so angles and distances are real.
 */

/** Lines within this many degrees of the page angle belong to the page layout. */
const SNAP_DEGREES = 12;
/** The page angle only follows the camera once it is this far off (a real turn, not shake). */
const TURN_DEGREES = 4;
/** Lines this close across (in line heights) are the same row. */
const SAME_ROW = 0.5;
/** Consecutive rows further apart than this (in line heights) are separate paragraphs. */
const MAX_ROW_GAP = 2;
/** Fragments of one row closer than this along the line (in line heights) are joined. */
const MAX_FRAGMENT_GAP = 2.5;
/** Lines whose heights differ more than this belong to different blocks (heading vs body). */
const MAX_SIZE_CHANGE = 0.45;
/** A row that ends this far (in line heights) before its block's right edge closes its sentence. */
const SHORT_ROW = 3;
/** Keep segments within what the translation socket accepts. */
const MAX_SEGMENT_CHARS = 480;

export type TrackedLine = { id: number; text: string; corners: Point[] };

/** A source line placed in its block, as fractions of the block (0..1 along and across). */
export type BlockRow = { start: number; end: number; top: number; bottom: number };

export type BlockSegment = {
  /** Stable while the segment's first line keeps its tracking id. */
  key: string;
  text: string;
  lineIds: number[];
  /** Indexes into the block's rows that this segment covers. */
  rows: number[];
  /** Normalised upright box tightly around this segment's lines (TL, TR, BR, BL). */
  corners: Point[];
  /** Segment length along the text, and median line height, in upright pixels. */
  length: number;
  lineHeight: number;
  /** The same lines as single-row segments, used when the merged box would run into another box. */
  parts?: BlockSegment[];
};

export type PageBlock = {
  id: number;
  /** Normalised upright corners: top-left, top-right, bottom-right, bottom-left. */
  corners: Point[];
  /** Median source line height in upright pixels. */
  lineHeight: number;
  /** Block length along the text in upright pixels. */
  length: number;
  rows: BlockRow[];
  segments: BlockSegment[];
};

type Placed = {
  line: TrackedLine;
  start: number;
  end: number;
  row: number;
  height: number;
};

const wrap = (degrees: number) => ((((degrees + 180) % 360) + 360) % 360) - 180;
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const LIST_ITEM = /^\s*(\(?\d{1,3}[.)]|\(?[a-zA-Z][.)]|[-•●▪◦*–])\s+/;

function shapeOf(corners: Point[]) {
  const [tl, tr, br, bl] = corners;
  const dx = tr.x - tl.x + br.x - bl.x;
  const dy = tr.y - tl.y + br.y - bl.y;
  return {
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    length: (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2,
    height: (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2,
    center: { x: (tl.x + tr.x + br.x + bl.x) / 4, y: (tl.y + tr.y + br.y + bl.y) / 4 },
  };
}

/** Joins wrapped source rows into one sentence, healing words hyphenated across lines. */
export function joinRows(rows: string[]) {
  let text = '';
  for (const raw of rows) {
    const row = raw.trim();
    if (!row) continue;
    if (!text) text = row;
    else if (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(row)) text = text.slice(0, -1) + row;
    else text = `${text} ${row}`;
  }
  return text;
}

class Union {
  private parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  join(a: number, b: number) {
    this.parent[this.find(a)] = this.find(b);
  }
}

type Quad = Point[];

export function overlaps(a: Quad, b: Quad) {
  // Separating axis test for two convex quads.
  for (const quad of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const p = quad[i];
      const q = quad[(i + 1) % 4];
      const axis = { x: p.y - q.y, y: q.x - p.x };
      const project = (points: Quad) => points.map((point) => point.x * axis.x + point.y * axis.y);
      const [pa, pb] = [project(a), project(b)];
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
    }
  }
  return true;
}

/** Shrinks a quad towards its centre by `inset` pixels on every side, so boxes that only touch don't count. */
export function inset(quad: Quad, by: number): Quad {
  const center = { x: quad.reduce((sum, p) => sum + p.x, 0) / 4, y: quad.reduce((sum, p) => sum + p.y, 0) / 4 };
  return quad.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const distance = Math.hypot(dx, dy) || 1;
    const scale = Math.max(0, distance - by) / distance;
    return { x: center.x + dx * scale, y: center.y + dy * scale };
  });
}

/**
 * A merged box must stand on its own: when the box around a multi-line segment runs into any other
 * segment's box (lines entering each other), that segment falls back to one box per line.
 */
export function separate(blocks: Omit<PageBlock, 'id'>[], image: Size): Omit<PageBlock, 'id'>[] {
  const toPx = (quad: Quad) => quad.map((p) => ({ x: p.x * image.width, y: p.y * image.height }));
  const boxes = blocks.flatMap((block, b) =>
    block.segments.map((segment, s) => ({ b, s, quad: inset(toPx(segment.corners), segment.lineHeight * 0.1) })),
  );
  const split = new Set<string>();
  for (const box of boxes) {
    if (!blocks[box.b].segments[box.s].parts) continue;
    if (boxes.some((other) => other !== box && overlaps(box.quad, other.quad))) split.add(`${box.b}:${box.s}`);
  }
  if (!split.size) return blocks;
  return blocks.map((block, b) => ({
    ...block,
    segments: block.segments.flatMap((segment, s) =>
      split.has(`${b}:${s}`) && segment.parts ? segment.parts : [segment],
    ),
  }));
}

export class PageBlocks {
  private angle?: number;
  private nextId = 0;
  private previous: { id: number; lineIds: Set<number> }[] = [];

  reset() {
    this.angle = undefined;
    this.previous = [];
  }

  /** Current page angle in upright image degrees (undefined before the first lines). */
  get pageAngle() {
    return this.angle;
  }

  build(lines: TrackedLine[], image: Size): PageBlock[] {
    if (!lines.length) {
      this.previous = [];
      return [];
    }
    const toPx = (p: Point) => ({ x: p.x * image.width, y: p.y * image.height });
    const shapes = lines.map((line) => ({ line, ...shapeOf(line.corners.map(toPx)) }));

    let x = 0;
    let y = 0;
    for (const shape of shapes) {
      const radians = (shape.angle * Math.PI) / 180;
      x += Math.cos(radians) * shape.length;
      y += Math.sin(radians) * shape.length;
    }
    const seen = (Math.atan2(y, x) * 180) / Math.PI;
    if (this.angle === undefined || Math.abs(wrap(seen - this.angle)) > TURN_DEGREES) this.angle = seen;

    const groups: { angle: number; placed: Placed[] }[] = [];
    const onPage: Placed[] = [];
    const along = { x: Math.cos((this.angle * Math.PI) / 180), y: Math.sin((this.angle * Math.PI) / 180) };
    const across = { x: -along.y, y: along.x };
    for (const shape of shapes) {
      if (Math.abs(wrap(shape.angle - this.angle)) > SNAP_DEGREES) {
        // Off-page text (a sign at an angle) gets its own block at its own angle.
        const r = (shape.angle * Math.PI) / 180;
        const a = { x: Math.cos(r), y: Math.sin(r) };
        const s = shape.center.x * a.x + shape.center.y * a.y;
        const row = -shape.center.x * a.y + shape.center.y * a.x;
        groups.push({
          angle: shape.angle,
          placed: [{ line: shape.line, start: s - shape.length / 2, end: s + shape.length / 2, row, height: shape.height }],
        });
        continue;
      }
      const s = shape.center.x * along.x + shape.center.y * along.y;
      onPage.push({
        line: shape.line,
        start: s - shape.length / 2,
        end: s + shape.length / 2,
        row: shape.center.x * across.x + shape.center.y * across.y,
        height: shape.height,
      });
    }

    const union = new Union(onPage.length);
    for (let i = 0; i < onPage.length; i++) {
      for (let j = i + 1; j < onPage.length; j++) {
        const a = onPage[i];
        const b = onPage[j];
        const height = Math.max(a.height, b.height);
        if (Math.abs(a.height - b.height) / height > MAX_SIZE_CHANGE) continue;
        const rowGap = Math.abs(a.row - b.row);
        const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
        if (rowGap <= SAME_ROW * height) {
          if (overlap > -MAX_FRAGMENT_GAP * height) union.join(i, j);
        } else if (rowGap <= MAX_ROW_GAP * height && overlap > 0) {
          union.join(i, j);
        }
      }
    }
    const byRoot = new Map<number, Placed[]>();
    onPage.forEach((placed, i) => {
      const root = union.find(i);
      byRoot.set(root, [...(byRoot.get(root) ?? []), placed]);
    });
    for (const placed of byRoot.values()) groups.push({ angle: this.angle, placed });

    const blocks = groups.map(({ angle, placed }) => this.toBlock(angle, placed, image));
    return this.assignIds(separate(blocks, image));
  }

  private toBlock(angle: number, placed: Placed[], image: Size): Omit<PageBlock, 'id'> {
    const lineHeight = median(placed.map((p) => p.height));
    const start = Math.min(...placed.map((p) => p.start));
    const end = Math.max(...placed.map((p) => p.end));
    const top = Math.min(...placed.map((p) => p.row - p.height / 2));
    const bottom = Math.max(...placed.map((p) => p.row + p.height / 2));
    const length = end - start;
    const depth = bottom - top;

    // Rows top to bottom; fragments of a row left to right.
    const sorted = [...placed].sort((a, b) => a.row - b.row);
    const rows: Placed[][] = [];
    for (const p of sorted) {
      const last = rows.at(-1);
      if (last && Math.abs(p.row - median(last.map((q) => q.row))) <= SAME_ROW * lineHeight) last.push(p);
      else rows.push([p]);
    }
    for (const row of rows) row.sort((a, b) => a.start - b.start);
    // OCR sometimes returns the same words twice, overlapping on one row: keep the longer reading.
    for (const row of rows) {
      for (let i = row.length - 1; i > 0; i--) {
        const [a, b] = [row[i - 1], row[i]];
        const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
        if (overlap > 0.5 * Math.min(a.end - a.start, b.end - b.start)) {
          row.splice(a.line.text.length >= b.line.text.length ? i : i - 1, 1);
        }
      }
    }

    const segments: BlockSegment[] = [];
    const a = (angle * Math.PI) / 180;
    const along = { x: Math.cos(a), y: Math.sin(a) };
    const across = { x: -along.y, y: along.x };
    const corner = (s: number, r: number) => ({
      x: (along.x * s + across.x * r) / image.width,
      y: (along.y * s + across.y * r) / image.height,
    });

    let open: { rows: string[]; ids: number[]; indexes: number[] } | null = null;
    const segmentOf = (indexes: number[]): BlockSegment | null => {
      const members = indexes.flatMap((index) => rows[index]);
      const text = joinRows(indexes.map((index) => rows[index].map((p) => p.line.text.trim()).join(' ')));
      if (!text) return null;
      const s0 = Math.min(...members.map((p) => p.start));
      const s1 = Math.max(...members.map((p) => p.end));
      const r0 = Math.min(...members.map((p) => p.row - p.height / 2));
      const r1 = Math.max(...members.map((p) => p.row + p.height / 2));
      const segment: BlockSegment = {
        key: String(members[0].line.id),
        text,
        lineIds: members.map((p) => p.line.id),
        rows: indexes,
        corners: [corner(s0, r0), corner(s1, r0), corner(s1, r1), corner(s0, r1)],
        length: s1 - s0,
        lineHeight: median(members.map((p) => p.height)),
      };
      if (indexes.length > 1) {
        segment.parts = indexes.flatMap((index) => segmentOf([index]) ?? []);
      }
      return segment;
    };
    const close = () => {
      if (!open) return;
      const segment = segmentOf(open.indexes);
      if (segment) segments.push(segment);
      open = null;
    };
    rows.forEach((row, index) => {
      const text = row.map((p) => p.line.text.trim()).join(' ');
      const ids = row.map((p) => p.line.id);
      const rowStart = row[0].start;
      const rowEnd = row[row.length - 1].end;
      const indentedMore = index > 0 && rowStart - rows[index - 1][0].start > 1.5 * lineHeight;
      if (open && (LIST_ITEM.test(text) || indentedMore || joinRows([...open.rows, text]).length > MAX_SEGMENT_CHARS)) {
        close();
      }
      if (!open) open = { rows: [], ids: [], indexes: [] };
      open.rows.push(text);
      open.indexes.push(index);
      open.ids.push(...ids);
      const short = end - rowEnd > SHORT_ROW * lineHeight;
      if (short || /[:.!?]$/.test(text) && end - rowEnd > lineHeight) close();
    });
    close();

    return {
      corners: [corner(start, top), corner(end, top), corner(end, bottom), corner(start, bottom)],
      lineHeight,
      length,
      rows: rows.map((row) => ({
        start: (row[0].start - start) / length,
        end: (row[row.length - 1].end - start) / length,
        top: (median(row.map((p) => p.row)) - lineHeight / 2 - top) / depth,
        bottom: (median(row.map((p) => p.row)) + lineHeight / 2 - top) / depth,
      })),
      segments,
    };
  }

  /** A block keeps its id while it shares the most lines with the same block as last time. */
  private assignIds(blocks: Omit<PageBlock, 'id'>[]): PageBlock[] {
    const unused = new Set(this.previous);
    const ids = blocks.map((block) => block.segments.flatMap((s) => s.lineIds));
    const order = blocks.map((_, i) => i).sort((a, b) => ids[b].length - ids[a].length);
    const assigned: number[] = [];
    for (const index of order) {
      let best: (typeof this.previous)[number] | undefined;
      let shared = 0;
      for (const candidate of unused) {
        const count = ids[index].filter((id) => candidate.lineIds.has(id)).length;
        if (count > shared) {
          best = candidate;
          shared = count;
        }
      }
      if (best) unused.delete(best);
      assigned[index] = best?.id ?? ++this.nextId;
    }
    this.previous = blocks.map((_, i) => ({ id: assigned[i], lineIds: new Set(ids[i]) }));
    return blocks.map((block, i) => ({ ...block, id: assigned[i] }));
  }
}
