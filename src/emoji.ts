export interface StrippedText {
  /** Text without emojis or the spaces left over after removing them. */
  text: string;
  /** Start position, in the original text, of each UTF-16 unit of `text`. */
  starts: number[];
  /** End position, in the original text, of each UTF-16 unit of `text`. */
  ends: number[];
}

interface Segment {
  segment: string;
  index: number;
}

type SegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' },
) => { segment(input: string): Iterable<Segment> };

const Segmenter = (Intl as typeof Intl & { Segmenter?: SegmenterConstructor }).Segmenter;
const segmenter = Segmenter ? new Segmenter(undefined, { granularity: 'grapheme' }) : null;

const emoji = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
// Pieces that only exist inside an emoji: joiner, variation selector, keycap, skin tone, and tags.
const emojiPart = /^(?:‍|️|⃣|\p{Emoji_Modifier}|[\u{e0020}-\u{e007f}])+$/u;
const space = /^\s+$/u;
const trailingSpace = /\s+$/u;

/** Without Intl.Segmenter, iterate by code point; loose emoji pieces are removed too. */
function* codePoints(input: string): Iterable<Segment> {
  let index = 0;
  for (const segment of input) {
    yield { segment, index };
    index += segment.length;
  }
}

export function hasEmoji(text: string): boolean {
  return emoji.test(text);
}

function isEmoji(segment: string): boolean {
  return emoji.test(segment) || emojiPart.test(segment);
}

function trimEnd(stripped: StrippedText): void {
  const text = stripped.text.replace(trailingSpace, '');
  stripped.text = text;
  stripped.starts.length = text.length;
  stripped.ends.length = text.length;
}

/**
 * Removes emojis and the space that separated them from the text, in each segment of a path:
 * `notes/🌲 Plants` becomes `notes/Plants`, and `Plan 💪🏻` becomes `Plan`.
 */
export function stripEmoji(input: string): StrippedText {
  const stripped: StrippedText = { text: '', starts: [], ends: [] };
  const segments = segmenter ? segmenter.segment(input) : codePoints(input);

  for (const { segment, index } of segments) {
    if (isEmoji(segment)) continue;
    if (space.test(segment) && (stripped.text === '' || /[\s/]$/u.test(stripped.text))) continue;
    if (segment === '/') trimEnd(stripped);
    stripped.text += segment;
    // Obsidian and its fuzzy search express positions in UTF-16 units.
    for (let unit = 0; unit < segment.length; unit += 1) {
      stripped.starts.push(index);
      stripped.ends.push(index + segment.length);
    }
  }

  trimEnd(stripped);
  return stripped;
}

/** Maps highlighted ranges from the stripped text back to the original text. */
export function remapMatches(
  matches: Array<[number, number]>,
  stripped: StrippedText,
): Array<[number, number]> {
  const mapped: Array<[number, number]> = [];

  for (const [start, end] of matches) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const from = Math.max(0, Math.floor(start));
    const to = Math.min(stripped.text.length, Math.ceil(end));
    if (from >= to) continue;
    mapped.push([stripped.starts[from]!, stripped.ends[to - 1]!]);
  }

  mapped.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const merged: Array<[number, number]> = [];

  for (const range of mapped) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push(range);
  }

  return merged;
}
