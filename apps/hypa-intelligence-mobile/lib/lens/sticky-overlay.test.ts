import assert from 'node:assert/strict';
import test from 'node:test';
import { cardPalette, holdSize, PALETTE_SWITCH_FRAMES, StickyOverlay } from './sticky-overlay';

const paper = { background: '#e8e2d0', color: '#222222' };
const inverted = { background: '#5a4a30', color: '#f2eee2' };
const shadow = { background: '#7a7468', color: '#202020' };
const night = { background: '#202020', color: '#f5f5f5' };
const blue = { background: '#a8c0f0', color: '#101010' };
const luma = (hex: string) => {
  const v = Number.parseInt(hex.slice(1), 16);
  return 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
};
const shape = (centerX: number, centerY = 100, length = 300, thickness = 60, angle = 0) =>
  ({ centerX, centerY, length, thickness, angle });

test('cards are always light with dark ink, even on a shadowed, inverted or dark page', () => {
  for (const lines of [[paper], [paper, inverted, inverted], [shadow], [night]]) {
    const palette = cardPalette(lines)!;
    assert.ok(luma(palette.background) >= 200, `${palette.background} is too dark`);
    assert.ok(luma(palette.color) < 60);
  }
});

test('the palette holds while the phone moves and switches only after a sustained change', () => {
  const sticky = new StickyOverlay();
  sticky.begin('Spanish', [paper], [], []);
  const first = sticky.colors.background;
  sticky.begin('Spanish', [blue], [], []);
  assert.equal(sticky.colors.background, first);
  for (let i = 1; i < PALETTE_SWITCH_FRAMES; i++) sticky.begin('Spanish', [blue], [], []);
  assert.notEqual(sticky.colors.background, first);
});

test('a translation changes only when a new one arrives, and resets with its segment', () => {
  const sticky = new StickyOverlay();
  sticky.begin('Spanish', [paper], ['1'], ['7']);
  assert.equal(sticky.text('7', 'Hola'), 'Hola');
  assert.equal(sticky.text('7', undefined), 'Hola');
  assert.equal(sticky.text('7', 'Buenas'), 'Buenas');
  sticky.begin('Spanish', [paper], ['1'], []);
  assert.equal(sticky.text('7', undefined), undefined);
});

test('OCR jitter does not move a card, a real move does', () => {
  const sticky = new StickyOverlay();
  sticky.place('1', shape(100), 20);
  assert.equal(sticky.place('1', shape(103), 20).centerX, 100);
  assert.equal(sticky.place('1', shape(130), 20).centerX, 130);
});

test('a card that grows re-centres so it covers the new line', () => {
  const sticky = new StickyOverlay();
  sticky.place('1', shape(100, 100, 300, 60), 20);
  const grown = sticky.place('1', shape(100, 103, 300, 80), 20);
  assert.equal(grown.thickness, 80);
  assert.equal(grown.centerY, 103);
});

test('cards grow at once and ignore small shrinks', () => {
  assert.equal(holdSize(100, 110), 110);
  assert.equal(holdSize(100, 90), 100);
  assert.equal(holdSize(100, 70), 70);
});

test('a new language or clear starts fresh', () => {
  const sticky = new StickyOverlay();
  sticky.begin('Spanish', [paper], ['1'], ['7']);
  sticky.text('7', 'Hola');
  sticky.begin('French', [paper], ['1'], ['7']);
  assert.equal(sticky.text('7', undefined), undefined);
  sticky.text('7', 'Salut');
  sticky.clear();
  assert.equal(sticky.text('7', undefined), undefined);
});

test('a re-formed segment keeps the translation its lines showed until a new one arrives', () => {
  const sticky = new StickyOverlay();
  const lines = [6, 7, 8].map((id) => ({ ...paper, id }));
  sticky.begin('Spanish', lines, ['1'], ['7']);
  sticky.text('7', 'Hola mundo', [7, 8]);
  sticky.begin('Spanish', lines, ['1'], ['6']);
  assert.equal(sticky.text('6', undefined, [6, 7, 8]), 'Hola mundo');
  assert.equal(sticky.text('6', 'Hola a todo el mundo', [6, 7, 8]), 'Hola a todo el mundo');
});

// settle(): what is actually drawn must not mirror OCR wobble.
import { APPEAR_PASSES, CARD_HOLD_MS } from './sticky-overlay';

const bar = (key: string, centerX: number, text?: string) => ({
  key,
  centerX,
  centerY: 100,
  length: 200,
  thickness: 20,
  angle: 90,
  lineHeight: 20,
  segments: [{ text }],
});

test('a skeleton is drawn only after being read in separate passes', () => {
  const sticky = new StickyOverlay();
  assert.equal(sticky.settle([bar('a', 50)], 1, 0).length, 0);
  assert.equal(sticky.settle([bar('a', 50)], 1, 10).length, 0, 'same pass does not count twice');
  assert.equal(APPEAR_PASSES, 2);
  assert.equal(sticky.settle([bar('a', 50)], 2, 200).length, 1);
});

test('a translated card is drawn at once', () => {
  const sticky = new StickyOverlay();
  assert.equal(sticky.settle([bar('a', 50, 'bonjour')], 1, 0).length, 1);
});

test('a drawn card survives a missed pass, then goes after the hold time', () => {
  const sticky = new StickyOverlay();
  sticky.settle([bar('a', 50)], 1, 0);
  sticky.settle([bar('a', 50)], 2, 200);
  assert.equal(sticky.settle([], 3, 400).length, 1, 'held through one missed pass');
  assert.equal(sticky.settle([], 4, 200 + CARD_HOLD_MS + 1).length, 0);
});

test('a held card is dropped when a live card now covers it', () => {
  const sticky = new StickyOverlay();
  sticky.settle([bar('old', 50)], 1, 0);
  sticky.settle([bar('old', 50)], 2, 200);
  const shown = sticky.settle([bar('new', 52, 'x')], 3, 300);
  assert.deepEqual(shown.map((card) => card.key), ['new']);
});

test('cards never overlap: translated first, then the longest standing', () => {
  const sticky = new StickyOverlay();
  const pair = (text?: string) => [bar('first', 50), { ...bar('second', 60, text), key: 'second' }];
  sticky.settle(pair(), 1, 0);
  assert.deepEqual(sticky.settle(pair(), 2, 200).map((card) => card.key), ['first']);
  assert.deepEqual(sticky.settle(pair('hi'), 3, 400).map((card) => card.key), ['second']);
});

test('side-by-side cards that only touch both stay', () => {
  const sticky = new StickyOverlay();
  sticky.settle([bar('a', 50), bar('b', 71)], 1, 0);
  assert.equal(sticky.settle([bar('a', 50), bar('b', 71)], 2, 200).length, 2);
});

test('clear() and a new target forget settled cards', () => {
  const sticky = new StickyOverlay();
  sticky.retarget('fr');
  sticky.settle([bar('a', 50, 'x')], 1, 0);
  sticky.retarget('yo');
  assert.equal(sticky.settle([], 2, 10).length, 0);
});

test('the loading skeleton plays once: only for lines there before the first translation', () => {
  const sticky = new StickyOverlay();
  sticky.retarget('yo');
  sticky.noteLines([1, 2]);
  assert.ok(sticky.mayLoad(1) && sticky.mayLoad(2));
  assert.equal(sticky.text('seg', 'bawo', [1]), 'bawo');
  sticky.noteLines([1, 2, 3]);
  assert.ok(sticky.mayLoad(1), 'lines already waiting still show their skeleton');
  assert.ok(sticky.mayLoad(2));
  assert.ok(!sticky.mayLoad(3), 'text that arrives later just appears when translated');
});

test('the skeleton plays again after clear() or a new target language', () => {
  const sticky = new StickyOverlay();
  sticky.retarget('yo');
  sticky.noteLines([1]);
  sticky.text('seg', 'bawo', [1]);
  assert.ok(!sticky.mayLoad(9));
  sticky.clear();
  assert.ok(sticky.mayLoad(9));
  sticky.retarget('yo');
  sticky.text('seg', 'bawo', [1]);
  assert.ok(!sticky.mayLoad(9));
  sticky.retarget('fr');
  assert.ok(sticky.mayLoad(9));
});
