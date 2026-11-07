import { Notice, Plugin, prepareFuzzySearch } from 'obsidian';
import { incompatibilityNotice, type SearchSurface } from './notice';
import { patchMethod, type MethodPatch } from './patch';
import { EmojiStripper, rescoreLinkResults, rescoreQuickResults, type LinkResult, type QuickResult } from './rescore';

interface NativeSurface {
  internalPlugins?: {
    plugins?: {
      switcher?: { enabled?: boolean; instance?: { QuickSwitcherModal?: { prototype: object } } };
    };
  };
  workspace: {
    editorSuggest?: { suggests?: Array<{ suggestManager?: object }> };
  };
}

function hasMethod(target: object | undefined, key: string): target is object {
  return !!target && typeof (target as Record<string, unknown>)[key] === 'function';
}

export default class EmojiInsensitiveSearch extends Plugin {
  private readonly stripper = new EmojiStripper();
  private readonly patches: MethodPatch[] = [];
  private readonly targets = new WeakSet<object>();
  private readonly warned = new Set<SearchSurface>();
  private status = { quickSwitcher: false, wikilinks: false };

  onload(): void {
    this.app.workspace.onLayoutReady(() => this.applyPatches());
    // Quick switcher is a core plugin, so it can be enabled later.
    this.registerEvent(this.app.workspace.on('layout-change', () => this.applyPatches()));
  }

  onunload(): void {
    for (const patch of [...this.patches].reverse()) patch.dispose();
    this.patches.length = 0;
    this.stripper.clear();
    this.status = { quickSwitcher: false, wikilinks: false };
  }

  getStatus(): Readonly<{ quickSwitcher: boolean; wikilinks: boolean }> { return { ...this.status }; }

  private warnOnce(surface: SearchSurface): void {
    this.status[surface] = false;
    if (this.warned.has(surface)) return;
    this.warned.add(surface);
    const message = incompatibilityNotice(surface);
    new Notice(message, 10000);
    console.warn(`[emoji-insensitive-search] ${message}`);
  }

  private applyPatches(): void {
    const native = this.app as unknown as NativeSurface;
    const switcher = native.internalPlugins?.plugins?.switcher;
    const prototype = switcher?.instance?.QuickSwitcherModal?.prototype;
    if (hasMethod(prototype, 'getSuggestions')) {
      if (!this.targets.has(prototype)) this.patchQuickSwitcher(prototype);
    } else if (switcher?.enabled !== false) this.warnOnce('quickSwitcher');

    const manager = native.workspace.editorSuggest?.suggests
      ?.map(suggester => suggester.suggestManager)
      .find(candidate => hasMethod(candidate, 'getFileSuggestions'));
    if (manager) {
      if (!this.targets.has(manager)) this.patchLinkSuggestions(manager);
    } else this.warnOnce('wikilinks');
  }

  private patchQuickSwitcher(prototype: object): void {
    try {
      this.patches.push(patchMethod<unknown, unknown[], unknown>(prototype, 'getSuggestions', (original, receiver, args) => {
        const results = original.apply(receiver, args);
        if (!this.status.quickSwitcher || typeof args[0] !== 'string') return results;
        if (!Array.isArray(results)) {
          this.warnOnce('quickSwitcher');
          return results;
        }
        const native = results as QuickResult[];
        try {
          return rescoreQuickResults(args[0], native, prepareFuzzySearch, this.stripper);
        } catch {
          this.warnOnce('quickSwitcher');
          return native;
        }
      }));
      this.targets.add(prototype);
      this.status.quickSwitcher = true;
    } catch { this.warnOnce('quickSwitcher'); }
  }

  private patchLinkSuggestions(manager: object): void {
    try {
      this.patches.push(patchMethod<unknown, unknown[], Promise<unknown>>(manager, 'getFileSuggestions', async (original, receiver, args) => {
        const results = await original.apply(receiver, args);
        if (!this.status.wikilinks || typeof args[1] !== 'string') return results;
        if (!Array.isArray(results)) {
          this.warnOnce('wikilinks');
          return results;
        }
        const native = results as LinkResult[];
        try {
          return rescoreLinkResults(args[1], native, prepareFuzzySearch, this.stripper);
        } catch {
          this.warnOnce('wikilinks');
          return native;
        }
      }));
      this.targets.add(manager);
      this.status.wikilinks = true;
    } catch { this.warnOnce('wikilinks'); }
  }
}
