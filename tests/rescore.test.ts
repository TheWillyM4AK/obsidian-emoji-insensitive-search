import { describe, expect, it, vi } from "vitest";
import {
  EmojiStripper, matchPath, rescoreLinkResults, rescoreQuickResults,
  type FileInfo, type LinkResult, type PrepareSearch, type QuickResult, type SearchMatch,
} from "../src/rescore";

/** Mimics Obsidian's fuzzy search: the earlier the match starts, the higher the score. */
const prepare: PrepareSearch = query => text => {
  const needle = query.toLowerCase().replace(/\s+/g, "");
  const haystack = text.toLowerCase();
  const matches: Array<[number, number]> = [];
  let cursor = 0;
  for (const character of needle) {
    const position = haystack.indexOf(character, cursor);
    if (position < 0) return null;
    const last = matches[matches.length - 1];
    if (last && last[1] === position) last[1] += 1;
    else matches.push([position, position + 1]);
    cursor = position + 1;
  }
  return { score: -0.01 - matches[0]![0] * 0.001 - text.length * 0.0001, matches };
};

const file = (path: string): FileInfo => ({ path, extension: path.slice(path.lastIndexOf(".") + 1) });
const display = (entry: FileInfo) => entry.extension === "md" ? entry.path.slice(0, -3) : entry.path;

/** Native Quick switcher results: the name first, then the full path with 1 point less. */
function nativeQuick(query: string, files: FileInfo[]): QuickResult[] {
  const search = prepare(query);
  const results: QuickResult[] = [];
  for (const entry of files) {
    const path = display(entry);
    const offset = path.lastIndexOf("/") + 1;
    const name = search(path.slice(offset));
    let match: SearchMatch | null = name
      ? { score: name.score, matches: name.matches.map(([start, end]) => [start + offset, end + offset]) }
      : null;
    if (!match) {
      const full = search(path);
      match = full ? { ...full, score: full.score - 1 } : null;
    }
    if (match) results.push({ type: "file", file: entry, match });
  }
  return results.sort((a, b) => b.match!.score - a.match!.score);
}

const names = (results: QuickResult[]) => results.map(result => result.alias ?? result.file?.path);

describe("rescoreQuickResults", () => {
  const files = [file("notes/Atlas Headrest.md"), file("🌍 Atlas.md"), file("notes/🎉 Atlas of Fun.md")];

  it("ranks first the note whose name starts with the query after the emoji", () => {
    const originals = nativeQuick("atlas", files);
    expect(names(originals)[0]).toBe("notes/Atlas Headrest.md");
    const results = rescoreQuickResults("atlas", originals, prepare, new EmojiStripper());
    // With this test scorer, the shorter stripped name wins at the same start.
    expect(names(results)).toEqual(["🌍 Atlas.md", "notes/🎉 Atlas of Fun.md", "notes/Atlas Headrest.md"]);
    expect(results[0]!.match!.matches).toEqual([[3, 8]]);
    expect(results[1]!.match!.matches).toEqual([[9, 14]]);
  });

  it("changes nothing when the query contains an emoji", () => {
    const originals = nativeQuick("🌍", files);
    expect(rescoreQuickResults("🌍", originals, prepare, new EmojiStripper())).toBe(originals);
  });

  it("changes nothing for an empty query", () => {
    const originals: QuickResult[] = [{ type: "file", file: files[1]!, match: null }];
    expect(rescoreQuickResults("  ", originals, prepare, new EmojiStripper())).toBe(originals);
  });

  it("does not prepare a search when no result has emojis", () => {
    const spy = vi.fn(prepare);
    const originals = nativeQuick("atlas", [file("Atlas.md"), file("Atlas Headrest.md")]);
    expect(rescoreQuickResults("atlas", originals, spy, new EmojiStripper())).toBe(originals);
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps the penalty for excluded files", () => {
    const originals = nativeQuick("atlas", [file("🌍 Atlas.md")]).map(result => ({
      ...result, downranked: true, match: { ...result.match!, score: result.match!.score - 10 },
    }));
    const [result] = rescoreQuickResults("atlas", originals, prepare, new EmojiStripper());
    expect(result!.match!.score).toBeCloseTo(prepare("atlas")("Atlas")!.score - 10);
    expect(result!.downranked).toBe(true);
  });

  it("improves aliases with emojis and leaves other result types unchanged", () => {
    const entry = file("Person.md");
    const unresolved: QuickResult = { type: "unresolved", linktext: "🌍 Atlas", match: { score: -5, matches: [] } };
    const alias: QuickResult = { type: "alias", file: entry, alias: "🌍 Atlas", match: prepare("atlas")("🌍 Atlas") };
    const results = rescoreQuickResults("atlas", [unresolved, alias], prepare, new EmojiStripper());
    expect(results[0]).toEqual({ ...alias, match: { score: prepare("atlas")("Atlas")!.score, matches: [[3, 8]] } });
    expect(results[1]).toBe(unresolved);
  });

  it("never lowers a score", () => {
    const original: QuickResult = { type: "file", file: file("🌍 Atlas.md"), match: { score: 5, matches: [[3, 8]] } };
    const originals = [original];
    expect(rescoreQuickResults("atlas", originals, prepare, new EmojiStripper())).toBe(originals);
  });
});

describe("matchPath", () => {
  it("uses the full path with 1 point less when the name does not match", () => {
    const match = matchPath(prepare("folder"), new EmojiStripper(), "🌲 Folder/Note");
    expect(match).toEqual({ score: prepare("folder")("Folder/Note")!.score - 1, matches: [[3, 9]] });
  });
});

describe("rescoreLinkResults", () => {
  const link = (path: string, query: string): LinkResult => {
    const match = prepare(query)(path)!;
    return { type: "file", file: file(`${path}.md`), path, score: match.score, matches: match.matches };
  };

  it("updates the score and highlights without changing the order", () => {
    const plain = link("Atlas Headrest", "atlas");
    const emoji = link("🌍 Atlas", "atlas");
    const results = rescoreLinkResults("atlas", [plain, emoji], prepare, new EmojiStripper());
    expect(results[0]).toBe(plain);
    expect(results[1]).toEqual({ ...emoji, score: prepare("atlas")("Atlas")!.score, matches: [[3, 8]] });
    expect(results[1]!.score).toBeGreaterThan(plain.score);
  });

  it("returns the same array when nothing changes", () => {
    const originals = [link("Atlas Headrest", "atlas")];
    expect(rescoreLinkResults("atlas", originals, prepare, new EmojiStripper())).toBe(originals);
    expect(rescoreLinkResults("🌍", originals, prepare, new EmojiStripper())).toBe(originals);
  });

  it("improves aliases and keeps unresolved links", () => {
    const pending: LinkResult = { type: "linktext", path: "🌍 Atlas", score: -1, matches: null };
    const native = prepare("atlas")("🌍 Atlas")!;
    const alias: LinkResult = {
      type: "alias", file: file("Person.md"), path: "Person", alias: "🌍 Atlas",
      score: native.score, matches: native.matches,
    };
    const results = rescoreLinkResults("atlas", [pending, alias], prepare, new EmojiStripper());
    expect(results[0]).toBe(pending);
    expect(results[1]!.score).toBeCloseTo(prepare("atlas")("Atlas")!.score);
    expect(results[1]!.matches).toEqual([[3, 8]]);
  });
});

describe("EmojiStripper", () => {
  it("respects the cache limit", () => {
    const stripper = new EmojiStripper(2);
    const first = stripper.strip("🌍 A");
    stripper.strip("🌍 B");
    stripper.strip("🌍 C");
    expect(stripper.strip("🌍 A")).not.toBe(first);
    expect(stripper.strip("🌍 C")).toBe(stripper.strip("🌍 C"));
  });
});
