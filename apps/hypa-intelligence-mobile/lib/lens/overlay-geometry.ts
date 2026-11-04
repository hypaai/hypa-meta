import type { Point } from './frame-points';

export type Size = { width: number; height: number };

export type LineShape = {
  centerX: number;
  centerY: number;
  length: number;
  thickness: number;
  angle: number;
};

export function coverPoint(point: Point, image: Size, view: Size): Point {
  const scale = Math.max(view.width / image.width, view.height / image.height);
  return {
    x: point.x * image.width * scale + (view.width - image.width * scale) / 2,
    y: point.y * image.height * scale + (view.height - image.height * scale) / 2,
  };
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

export function lineShape([topLeft, topRight, bottomRight, bottomLeft]: Point[]): LineShape {
  return {
    centerX: (topLeft.x + topRight.x + bottomRight.x + bottomLeft.x) / 4,
    centerY: (topLeft.y + topRight.y + bottomRight.y + bottomLeft.y) / 4,
    length: (distance(topLeft, topRight) + distance(bottomLeft, bottomRight)) / 2,
    thickness: (distance(topLeft, bottomLeft) + distance(topRight, bottomRight)) / 2,
    angle:
      (Math.atan2(
        topRight.y - topLeft.y + bottomRight.y - bottomLeft.y,
        topRight.x - topLeft.x + bottomRight.x - bottomLeft.x
      ) *
        180) /
      Math.PI,
  };
}

/** The four corners of a card (TL, TR, BR, BL), in view points, after its rotation. */
export function shapeQuad(shape: LineShape): Point[] {
  const radians = (shape.angle * Math.PI) / 180;
  const along = { x: Math.cos(radians), y: Math.sin(radians) };
  const across = { x: -along.y, y: along.x };
  const [hl, ht] = [shape.length / 2, shape.thickness / 2];
  return [
    [-hl, -ht],
    [hl, -ht],
    [hl, ht],
    [-hl, ht],
  ].map(([s, r]) => ({
    x: shape.centerX + along.x * s + across.x * r,
    y: shape.centerY + along.y * s + across.y * r,
  }));
}

/** True when the centre of `inner` sits inside the card `outer` (a re-read of the same text). */
export function covers(outer: LineShape, inner: LineShape): boolean {
  const radians = (outer.angle * Math.PI) / 180;
  const dx = inner.centerX - outer.centerX;
  const dy = inner.centerY - outer.centerY;
  const s = dx * Math.cos(radians) + dy * Math.sin(radians);
  const r = -dx * Math.sin(radians) + dy * Math.cos(radians);
  return Math.abs(s) <= outer.length / 2 && Math.abs(r) <= outer.thickness / 2;
}

/**
 * Lines of one paragraph share one card thickness (their median), so the bars read as a set instead
 * of each following its own noisy OCR box. Never thinner than MIN_SHARE of the line's own box, so the
 * source text stays covered.
 */
export const MIN_SHARE = 0.85;
export function evenThickness(shape: LineShape, shared: number): LineShape {
  return { ...shape, thickness: Math.max(shared, shape.thickness * MIN_SHARE) };
}
