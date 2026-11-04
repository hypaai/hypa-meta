import assert from 'node:assert/strict';
import test from 'node:test';
import { fitText, MIN_FONT, wrappedLines } from './fit-text';

test('words wrap to the card width', () => {
  assert.equal(wrappedLines('hello world', 10, 1000), 1);
  assert.equal(wrappedLines('aaaa bbbb cccc', 10, 50), 3);
});

test('a short translation keeps the source text size', () => {
  assert.equal(fitText(['Hola'], 300, 20, 16).fontSize, 16);
});

test('a long translation shrinks to fit the card', () => {
  const { fontSize, height } = fitText(['palabra '.repeat(40)], 300, 60, 16);
  assert.ok(fontSize < 16 && fontSize >= MIN_FONT);
  assert.equal(height, 60);
});

test('when nothing fits the card grows instead of hiding text', () => {
  const { fontSize, height } = fitText(['palabra '.repeat(200)], 100, 20, 16);
  assert.equal(fontSize, MIN_FONT);
  assert.ok(height > 20);
});

import { sharedFont } from './fit-text';

test('a block shares the median size', () => {
  assert.equal(sharedFont([]), undefined);
  assert.equal(sharedFont([12]), 12);
  assert.equal(sharedFont([14, 6, 12, 12, 13]), 12);
});
