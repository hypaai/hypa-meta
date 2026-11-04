import assert from 'node:assert/strict';
import test from 'node:test';
import { joinRows, PageBlocks, type TrackedLine } from './page-blocks';

const image = { width: 1000, height: 1000 };
let nextId = 0;
// A horizontal line at row y (px) from x to x + length, 20px tall.
const line = (text: string, x: number, y: number, length: number, height = 20, id = ++nextId): TrackedLine => ({
  id,
  text,
  corners: [
    { x: x / 1000, y: (y - height / 2) / 1000 },
    { x: (x + length) / 1000, y: (y - height / 2) / 1000 },
    { x: (x + length) / 1000, y: (y + height / 2) / 1000 },
    { x: x / 1000, y: (y + height / 2) / 1000 },
  ],
});

test('wrapped lines of a paragraph become one block and one sentence', () => {
  const blocks = new PageBlocks().build(
    [line('Budgeting is flexible and will be', 100, 100, 600), line('finalized collectively.', 100, 128, 400)],
    image,
  );
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].segments.map((s) => s.text), ['Budgeting is flexible and will be finalized collectively.']);
  assert.equal(blocks[0].rows.length, 2);
});

test('list items and short headings keep their own segments inside the block', () => {
  const blocks = new PageBlocks().build(
    [
      line('Timeline', 100, 100, 150),
      line('1. Timeline & Milestones: Scheduled for', 100, 128, 600),
      line('rollout in November.', 100, 156, 300),
      line('2. Investor Strategy: Focus on profit', 100, 184, 600),
    ],
    image,
  );
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].segments.map((s) => s.text), [
    'Timeline',
    '1. Timeline & Milestones: Scheduled for rollout in November.',
    '2. Investor Strategy: Focus on profit',
  ]);
});

test('paragraphs far apart, or text of a very different size, are separate blocks', () => {
  const blocks = new PageBlocks().build(
    [line('First paragraph', 100, 100, 500), line('Second paragraph', 100, 200, 500), line('BIG TITLE', 100, 40, 500, 50)],
    image,
  );
  assert.equal(blocks.length, 3);
});

test('fragments of one row are joined in reading order', () => {
  const blocks = new PageBlocks().build([line('world', 400, 100, 200), line('Hello', 100, 100, 270)], image);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].segments[0].text, 'Hello world');
});

test('a block keeps its id as lines come and go', () => {
  const pages = new PageBlocks();
  const a = line('one two three four', 100, 100, 600, 20, 501);
  const b = line('five six', 100, 128, 300, 20, 502);
  const first = pages.build([a, b], image)[0].id;
  assert.equal(pages.build([a], image)[0].id, first);
  assert.equal(pages.build([a, b, line('seven', 100, 156, 200, 20, 503)], image)[0].id, first);
});

test('words hyphenated across lines are healed', () => {
  assert.equal(joinRows(['manage-', 'ment plan']), 'management plan');
  assert.equal(joinRows(['Covid-', '19']), 'Covid- 19');
});

test('each segment carries a tight box around only its own lines', () => {
  const blocks = new PageBlocks().build(
    [line('Heading', 100, 100, 150), line('1. First item that wraps', 100, 128, 600), line('onto a second row.', 100, 156, 300)],
    image,
  );
  const [heading, item] = blocks[0].segments;
  assert.ok(Math.abs(heading.corners[2].y * 1000 - 110) < 1e-6);
  assert.ok(Math.abs(item.corners[0].y * 1000 - 118) < 1e-6);
  assert.ok(Math.abs(item.corners[2].y * 1000 - 166) < 1e-6);
  assert.equal(heading.length, 150);
});

test('two overlapping readings of the same words are not translated twice', () => {
  const blocks = new PageBlocks().build(
    [line('VOLUME 26, 2026', 100, 100, 300), line('VOLUME 26 2006', 105, 102, 290)],
    image,
  );
  assert.equal(blocks[0].segments[0].text, 'VOLUME 26, 2026');
});

test('a merged box that runs into another box splits back into one box per line', () => {
  const blocks = new PageBlocks().build(
    [
      line('This sentence wraps', 100, 100, 600),
      line('onto a second row.', 100, 126, 300),
      // A separate label (different size, so its own block) sitting inside the merged box.
      line('LABEL', 500, 128, 150, 50),
    ],
    image,
  );
  const texts = blocks.flatMap((block) => block.segments.map((segment) => segment.text)).sort();
  assert.deepEqual(texts, ['LABEL', 'This sentence wraps', 'onto a second row.']);
});

test('boxes that only sit next to each other still merge', () => {
  const blocks = new PageBlocks().build(
    [line('This sentence wraps', 100, 100, 600), line('onto a second row.', 100, 124, 300), line('Far away', 100, 300, 200)],
    image,
  );
  assert.ok(blocks.some((block) => block.segments.some((s) => s.text === 'This sentence wraps onto a second row.')));
});
