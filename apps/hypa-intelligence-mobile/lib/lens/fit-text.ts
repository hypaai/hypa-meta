/** Average glyph advance as a fraction of font size; a little generous so text never overflows. */
export const CHAR_WIDTH = 0.56;
export const LINE_HEIGHT = 1.22;
export const MIN_FONT = 6;
const STEP = 0.5;

export function wrappedLines(text: string, fontSize: number, width: number) {
  const perLine = Math.max(1, Math.floor(width / (fontSize * CHAR_WIDTH)));
  let lines = 0;
  let used = perLine;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const size = word.length;
    if (used + (used ? 1 : 0) + size <= perLine && lines) {
      used += (used ? 1 : 0) + size;
    } else {
      lines += Math.max(1, Math.ceil(size / perLine));
      used = size % perLine || perLine;
    }
  }
  return Math.max(lines, 1);
}

/**
 * One font size for a whole card: the largest (up to the source text size) at which every segment,
 * wrapped to the card width, fits the card height. If nothing fits, returns the minimum and the
 * height the card needs to grow to.
 */
export function fitText(segments: string[], width: number, height: number, maxFont: number) {
  const top = Math.max(MIN_FONT, Math.floor(maxFont / STEP) * STEP);
  const need = (font: number) =>
    segments.reduce((sum, text) => sum + wrappedLines(text, font, width), 0) * font * LINE_HEIGHT;
  for (let font = top; font >= MIN_FONT; font -= STEP) {
    if (need(font) <= height) return { fontSize: font, height };
  }
  return { fontSize: MIN_FONT, height: Math.max(height, need(MIN_FONT)) };
}

/**
 * The size a block's translations share: the median of what each card could fit on its own. Cards that
 * could have been larger come down to it, so a paragraph reads as one size; cards that fit less keep
 * their smaller size, because the text would not fit their box otherwise.
 */
export function sharedFont(fits: number[]) {
  if (!fits.length) return undefined;
  const sorted = [...fits].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
