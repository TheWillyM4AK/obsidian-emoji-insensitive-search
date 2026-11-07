import { hasEmoji, remapMatches, stripEmoji, type StrippedText } from './emoji';

export interface SearchMatch {
  score: number;
  matches: Array<[number, number]>;
}
export type FuzzySearch = (text: string) => SearchMatch | null;
export type PrepareSearch = (query: string) => FuzzySearch;

export interface FileInfo {
  path: string;
  extension: string;
}
export interface QuickResult {
  type: string;
  file?: FileInfo;
  alias?: string;
  match: SearchMatch | null;
  downranked?: boolean;
  [key: string]: unknown;
}
export interface LinkResult {
  type: string;
  file?: FileInfo;
  path: string;
  alias?: string;
  score: number;
  matches: Array<[number, number]> | null;
  downranked?: boolean;
  [key: string]: unknown;
}

/** Obsidian subtracts 10 points from files in "Excluded files". */
const IGNORED_PENALTY = -10;

/** The cache only keeps names in memory and has a fixed size. */
export class EmojiStripper {
  private readonly cache = new Map<string, StrippedText>();

  constructor(private readonly capacity = 4096) {}

  strip(text: string): StrippedText {
    const cached = this.cache.get(text);
    if (cached) return cached;
    const stripped = stripEmoji(text);
    if (this.cache.size >= this.capacity) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(text, stripped);
    return stripped;
  }

  clear(): void { this.cache.clear(); }
}

export function matchText(search: FuzzySearch, stripper: EmojiStripper, text: string): SearchMatch | null {
  const stripped = stripper.strip(text);
  if (!stripped.text) return null;
  const match = search(stripped.text);
  return match ? { score: match.score, matches: remapMatches(match.matches, stripped) } : null;
}

/** Like Obsidian: the file name first; if it does not match, the full path with 1 point less. */
export function matchPath(search: FuzzySearch, stripper: EmojiStripper, path: string): SearchMatch | null {
  const offset = path.lastIndexOf('/') + 1;
  const name = matchText(search, stripper, path.slice(offset));
  if (name) {
    return { score: name.score, matches: name.matches.map(([start, end]) => [start + offset, end + offset]) };
  }
  const full = matchText(search, stripper, path);
  return full ? { score: full.score - 1, matches: full.matches } : null;
}

function displayPath(file: FileInfo): string {
  return file.extension === 'md' ? file.path.slice(0, -3) : file.path;
}

/**
 * Returns the emoji-free score if it beats the native one. Removing emojis only deletes
 * characters, so it cannot create new matches: rescoring the native results is enough.
 */
function improve(
  search: () => FuzzySearch,
  stripper: EmojiStripper,
  text: string,
  isPath: boolean,
  current: number,
  downranked: boolean | undefined,
): SearchMatch | null {
  if (!hasEmoji(text)) return null;
  const match = isPath ? matchPath(search(), stripper, text) : matchText(search(), stripper, text);
  if (!match) return null;
  const score = match.score + (downranked ? IGNORED_PENALTY : 0);
  return score > current ? { score, matches: match.matches } : null;
}

/** Emojis are only ignored when the query contains none. */
function searchFor(query: string, prepare: PrepareSearch): (() => FuzzySearch) | null {
  if (!query || hasEmoji(query)) return null;
  let search: FuzzySearch | null = null;
  return () => (search ??= prepare(query));
}

export function rescoreQuickResults(
  query: string,
  results: QuickResult[],
  prepare: PrepareSearch,
  stripper: EmojiStripper,
): QuickResult[] {
  const search = searchFor(query.trim(), prepare);
  if (!search) return results;
  let changed = false;
  const rescored = results.map(result => {
    if (!result.match || !result.file) return result;
    const isFile = result.type === 'file';
    const text = isFile ? displayPath(result.file) : result.type === 'alias' ? result.alias : undefined;
    if (typeof text !== 'string') return result;
    const match = improve(search, stripper, text, isFile, result.match.score, result.downranked);
    if (!match) return result;
    changed = true;
    return { ...result, match: { ...result.match, ...match } };
  });
  // Quick switcher returns the list already sorted, so re-sort it the same way Obsidian does.
  return changed ? rescored.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0)) : results;
}

export function rescoreLinkResults(
  query: string,
  results: LinkResult[],
  prepare: PrepareSearch,
  stripper: EmojiStripper,
): LinkResult[] {
  const search = searchFor(query.trim(), prepare);
  if (!search) return results;
  let changed = false;
  const rescored = results.map(result => {
    if (!result.file || typeof result.score !== 'number') return result;
    const isFile = result.type === 'file';
    const text = isFile ? result.path : result.type === 'alias' ? result.alias : undefined;
    if (typeof text !== 'string') return result;
    const match = improve(search, stripper, text, isFile, result.score, result.downranked);
    if (!match) return result;
    changed = true;
    return { ...result, score: match.score, matches: match.matches };
  });
  // Obsidian sorts [[ suggestions afterwards.
  return changed ? rescored : results;
}
