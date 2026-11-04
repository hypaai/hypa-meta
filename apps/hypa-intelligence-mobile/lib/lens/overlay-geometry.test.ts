import assert from 'node:assert/strict';
import test from 'node:test';

import { coverPoint, lineShape } from './overlay-geometry';

test('a portrait image that is wider than the screen is cropped left and right', () => {
  const image = { width: 720, height: 1280 };
  const view = { width: 400, height: 900 };
  assert.deepEqual(coverPoint({ x: 0.5, y: 0.5 }, image, view), { x: 200, y: 450 });
  const left = coverPoint({ x: 0, y: 0 }, image, view);
  assert.ok(left.x < 0);
  assert.equal(left.y, 0);
});

test('a horizontal line keeps its length, thickness and a zero angle', () => {
  const shape = lineShape([
    { x: 10, y: 10 },
    { x: 110, y: 10 },
    { x: 110, y: 30 },
    { x: 10, y: 30 },
  ]);
  assert.deepEqual(shape, { centerX: 60, centerY: 20, length: 100, thickness: 20, angle: 0 });
});

test('text running top to bottom has a 90 degree angle', () => {
  const shape = lineShape([
    { x: 50, y: 0 },
    { x: 50, y: 200 },
    { x: 30, y: 200 },
    { x: 30, y: 0 },
  ]);
  assert.equal(shape.angle, 90);
  assert.equal(shape.length, 200);
  assert.equal(shape.thickness, 20);
});

import { covers, evenThickness, shapeQuad } from './overlay-geometry';

test('shapeQuad of an upright card is its rectangle', () => {
  const quad = shapeQuad({ centerX: 50, centerY: 20, length: 40, thickness: 10, angle: 0 });
  assert.deepEqual(quad.map((p) => [Math.round(p.x), Math.round(p.y)]), [[30, 15], [70, 15], [70, 25], [30, 25]]);
});

test('covers follows the card rotation', () => {
  const tall = { centerX: 0, centerY: 0, length: 100, thickness: 10, angle: 90 };
  assert.ok(covers(tall, { ...tall, centerY: 40 }));
  assert.ok(!covers(tall, { ...tall, centerX: 40 }));
});

test('evenThickness shares one thickness without exposing the source line', () => {
  const line = { centerX: 0, centerY: 0, length: 100, thickness: 30, angle: 0 };
  assert.equal(evenThickness(line, 20).thickness, 30 * 0.85, 'wide boxes shrink only slightly');
  assert.equal(evenThickness({ ...line, thickness: 12 }, 20).thickness, 20, 'thin boxes grow to the share');
});
