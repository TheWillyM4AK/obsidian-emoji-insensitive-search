import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App, PluginManifest } from "obsidian";
import type { LinkResult, QuickResult } from "../src/rescore";

const mock = vi.hoisted(() => ({ notice: vi.fn() }));

vi.mock("obsidian", () => ({
  Plugin: class {
    registerEvent = vi.fn();
    constructor(public app: unknown) {}
  },
  Notice: class {
    constructor(message: string, duration: number) { mock.notice(message, duration); }
  },
  // A plain substring match is enough to check the plugin lifecycle.
  prepareFuzzySearch: (query: string) => (text: string) => {
    const position = text.toLowerCase().indexOf(query.toLowerCase());
    return position < 0 ? null : { score: -position, matches: [[position, position + query.length]] };
  },
}));

import EmojiInsensitiveSearch from "../src/main";

const manifest: PluginManifest = {
  id: "emoji-insensitive-search", name: "Emoji Insensitive Search", version: "0.1.0",
  minAppVersion: "1.15.0", description: "Test", author: "Test", isDesktopOnly: false,
};

function environment(options: { missingQuick?: boolean; switcherDisabled?: boolean; missingLinks?: boolean } = {}) {
  const atlas = { path: "🌍 Atlas.md", extension: "md" };
  const headrest = { path: "Atlas Headrest.md", extension: "md" };
  let quickOriginals: unknown = [
    { type: "file", file: headrest, match: { score: -1, matches: [[0, 5]] } },
    { type: "file", file: atlas, match: { score: -3, matches: [[3, 8]] } },
  ] satisfies QuickResult[];
  let linkOriginals: unknown = [
    { type: "file", file: atlas, path: "🌍 Atlas", score: -3, matches: [[3, 8]] },
  ] satisfies LinkResult[];
  const nativeQuick = vi.fn<(...args: unknown[]) => unknown>(() => quickOriginals);
  const nativeLink = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => linkOriginals);
  const prototype = { getSuggestions: nativeQuick };
  const manager = { getFileSuggestions: nativeLink };
  const ready: Array<() => void> = [];
  const app = {
    internalPlugins: {
      plugins: {
        switcher: options.missingQuick || options.switcherDisabled
          ? { enabled: !options.switcherDisabled }
          : { enabled: true, instance: { QuickSwitcherModal: { prototype } } },
      },
    },
    workspace: {
      onLayoutReady: (callback: () => void) => ready.push(callback),
      on: vi.fn(() => ({})),
      editorSuggest: { suggests: options.missingLinks ? [] : [{}, { suggestManager: manager }] },
    },
  };
  const plugin = new EmojiInsensitiveSearch(app as unknown as App, manifest);
  plugin.onload();
  ready.forEach(callback => callback());
  return {
    plugin, prototype, manager, nativeQuick, nativeLink,
    setQuick: (value: unknown) => { quickOriginals = value; },
    setLink: (value: unknown) => { linkOriginals = value; },
  };
}

beforeEach(() => mock.notice.mockClear());

describe("EmojiInsensitiveSearch", () => {
  it("patches Quick switcher and [[ suggestions", async () => {
    const { plugin, prototype, manager } = environment();
    expect(plugin.getStatus()).toEqual({ quickSwitcher: true, wikilinks: true });
    const quick = prototype.getSuggestions.call({}, "atlas") as QuickResult[];
    expect(quick.map(result => result.file?.path)).toEqual(["🌍 Atlas.md", "Atlas Headrest.md"]);
    const links = await manager.getFileSuggestions.call({}, {}, "atlas") as LinkResult[];
    expect(links[0]!.score).toBe(0);
    expect(links[0]!.matches).toEqual([[3, 8]]);
  });

  it("keeps native search when the query contains an emoji", () => {
    const { prototype, nativeQuick } = environment();
    const results = prototype.getSuggestions.call({}, "🌍");
    expect(results).toBe(nativeQuick.mock.results[0]!.value);
  });

  it("restores the original methods when disabled", () => {
    const { plugin, prototype, manager, nativeQuick, nativeLink } = environment();
    plugin.onunload();
    expect(prototype.getSuggestions).toBe(nativeQuick);
    expect(manager.getFileSuggestions).toBe(nativeLink);
    expect(plugin.getStatus()).toEqual({ quickSwitcher: false, wikilinks: false });
  });

  it("shows one notice for each missing search surface", () => {
    const { plugin } = environment({ missingQuick: true, missingLinks: true });
    expect(plugin.getStatus()).toEqual({ quickSwitcher: false, wikilinks: false });
    expect(mock.notice).toHaveBeenCalledTimes(2);
    expect(mock.notice.mock.calls[0]![0]).toContain("Quick switcher");
    expect(mock.notice.mock.calls[1]![0]).toContain("[[ suggestions");
  });

  it("shows no notice when Quick switcher is disabled in Obsidian", () => {
    environment({ switcherDisabled: true });
    expect(mock.notice).not.toHaveBeenCalled();
  });

  it("falls back to native search when the result format changes", async () => {
    const { plugin, prototype, manager, setQuick, setLink } = environment();
    const unexpected = { results: [] };
    setQuick(unexpected);
    expect(prototype.getSuggestions.call({}, "atlas")).toBe(unexpected);
    const broken = [{ type: "file", get file(): never { throw new Error("internal change"); } }];
    setLink(broken);
    expect(await manager.getFileSuggestions.call({}, {}, "atlas")).toBe(broken);
    expect(plugin.getStatus()).toEqual({ quickSwitcher: false, wikilinks: false });
    expect(mock.notice).toHaveBeenCalledTimes(2);
  });
});
