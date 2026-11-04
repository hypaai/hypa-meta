/**
 * Lens shows exactly what comes back, so it must be the bare translation: no quotes, labels,
 * notes, alternatives or "Translating now..." chatter.
 */
const LABEL = /^\s*(?:\*\*)?(?:translation|translated(?: text)?|result|output|[\p{L} ]{2,20} translation)(?:\*\*)?\s*[:：]\s*/iu;
const NOTE = /^\s*(?:\(|\[|\*|note\b|n\.b\.|explanation\b|alternatively\b|or\b:?|literally\b)/i;
const CHATTER = /\b(?:translating|translated|translation|fetching|here(?:'s| is)|i (?:will|'ll)|let me|one moment|sure)\b/i;
const QUOTES: [string, string][] = [['"', '"'], ["'", "'"], ['“', '”'], ['‘', '’'], ['«', '»'], ['„', '“'], ['`', '`']];

export function cleanLensTranslation(raw: string, source: string): string | null {
  let lines = raw
    .replace(/```[a-z]*\n?|```/gi, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  lines = lines.map((line) => line.replace(LABEL, ''));
  // The first line is the translation; later lines are only kept if they aren't notes.
  lines = [lines[0], ...lines.slice(1).filter((line) => !NOTE.test(line) && !CHATTER.test(line))];
  let text = lines.join(' ').replace(/\s+/g, ' ').trim();
  for (const [open, close] of QUOTES) {
    if (text.length > 1 && text.startsWith(open) && text.endsWith(close) && !source.trim().startsWith(open)) {
      text = text.slice(open.length, -close.length).trim();
    }
  }
  if (!text) return null;
  // Chatter the source itself doesn't contain means the model talked instead of translating.
  if (CHATTER.test(text) && !CHATTER.test(source)) return null;
  // A "translation" many times longer than the line is an explanation, not a translation.
  if (text.length > source.length * 4 + 40) return null;
  return text;
}
