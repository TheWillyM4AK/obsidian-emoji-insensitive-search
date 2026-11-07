// Run with the Obsidian CLI (see the README). Loads main.js in memory only, uses fictional
// files and aliases, and unloads the plugin at the end: it never writes to the vault.
(async function (app, source) {
  const id = 'emoji-insensitive-search';
  const passed = [];
  const failures = [];
  const check = (name, condition) => (condition ? passed : failures).push(name);
  if (app.plugins.plugins[id] || app.plugins.manifests[id]) {
    return { passed: 0, failures: ['The plugin is already installed: disable it before running this check'] };
  }

  const switcher = app.internalPlugins.plugins.switcher.instance.QuickSwitcherModal.prototype;
  const suggester = app.workspace.editorSuggest.suggests.find(item => item.suggestManager?.getFileSuggestions);
  const manager = suggester.suggestManager;
  const quickOriginal = switcher.getSuggestions;
  const linkOriginal = manager.getFileSuggestions;

  const dir = `${app.vault.configDir}/plugins/${id}-in-memory`;
  const adapter = app.vault.adapter;
  const read = adapter.read;
  app.plugins.manifests[id] = {
    id, name: 'Emoji Insensitive Search', version: 'test', minAppVersion: '1.15.0',
    description: 'In-memory test', author: 'Test', isDesktopOnly: false, dir
  };
  adapter.read = function (path, ...rest) {
    return path === `${dir}/main.js` ? Promise.resolve(source) : read.call(this, path, ...rest);
  };
  let plugin;
  try {
    plugin = await app.plugins.loadPlugin(id);
  } finally {
    adapter.read = read;
  }

  try {
    await new Promise(resolve => app.workspace.onLayoutReady(resolve));
    check('Both search surfaces patched', plugin?.getStatus().quickSwitcher && plugin.getStatus().wikilinks);

    const prototype = Object.getPrototypeOf(app.vault.getFiles()[0]);
    const file = (path) => {
      const name = path.split('/').pop();
      const extension = name.slice(name.lastIndexOf('.') + 1);
      return Object.assign(Object.create(prototype), {
        path, name, extension, basename: name.slice(0, -(extension.length + 1)),
        stat: { mtime: 1, ctime: 1, size: 0 }, parent: null
      });
    };
    const headrest = file('Notes/Atlas Headrest.md');
    const atlas = file('🌍 Atlas.md');
    const fun = file('Notes/🎉 Atlas of Fun.md');
    const plain = file('Work/Calendar 2026.md');
    const calendar = file('📅 Calendar.md');
    const cafe = file('Notes/☕ Café.md');
    const humanities = file('Notes/🏛️ Atlas of Humanities.md');
    const maps = file('Map 🗺️ of maps.md');
    const person = file('Person.md');
    const hidden = file('Hidden/🌍 Private atlas.md');
    const files = [headrest, atlas, fun, plain, calendar, cafe, humanities, maps, person, hidden];
    const aliases = new Map([[person, ['🧭 World']]]);
    const path = (entry) => entry.extension === 'md' ? entry.path.slice(0, -3) : entry.path;
    const fakeApp = (list, aliasMap = aliases) => ({
      vault: { getFiles: () => list, getAbstractFileByPath: p => list.find(f => f.path === p), getConfig: () => false },
      metadataCache: {
        getLinkSuggestions: () => list.flatMap(f => [
          { file: f, path: path(f) },
          ...(aliasMap.get(f) ?? []).map(alias => ({ file: f, path: path(f), alias }))
        ]),
        getFileCache: f => ({ frontmatter: { aliases: aliasMap.get(f) ?? [] } }),
        isUserIgnored: p => p.startsWith('Hidden/'),
        unresolvedLinks: { 'source.md': { '🌍 Pending atlas': 1 } },
        fileToLinktext: f => f.basename
      },
      workspace: { getRecentFiles: () => [atlas.path] },
      internalPlugins: { getEnabledPluginById: () => null },
      embedRegistry: { isExtensionRegistered: () => false },
      viewRegistry: { isExtensionRegistered: () => false }
    });
    const context = (list = files) => ({
      app: fakeApp(list), context: 'view', shouldShowMarkdown: true, shouldShowNonAttachments: true,
      shouldShowImages: false, shouldShowNonImageAttachments: false, shouldShowAllTypes: false,
      shouldShowAlias: true, shouldShowUnresolved: true, shouldShowNonFileBookmarks: false
    });
    const quick = (query, list) => switcher.getSuggestions.call(context(list), query);
    const quickNative = (query, list) => quickOriginal.call(context(list), query);
    const linkContext = (list = files) => Object.assign(Object.create(manager), {
      app: fakeApp(list), fileSuggestions: null, runnable: null, getSourcePath: () => ''
    });
    // Goes through the real suggester so that Obsidian sorts the results as in the editor.
    const link = async (query, list) => {
      const host = Object.assign(Object.create(suggester), { suggestManager: linkContext(list), setInstructions() {} });
      return await suggester.getSuggestions.call(host, { query });
    };
    const summarize = results => JSON.stringify(results.map(r => ({
      type: r.type, file: r.file?.path, alias: r.alias, path: r.path, linktext: r.linktext,
      match: r.match, score: r.score, matches: r.matches, downranked: r.downranked
    })));
    const first = results => results[0]?.alias ?? results[0]?.file?.path;

    check('Without the plugin, "atlas" ranks Atlas Headrest first', first(quickNative('atlas')) === headrest.path);
    check('Without the plugin, "cal" ranks Calendar 2026 first', first(quickNative('cal')) === plain.path);
    check('Quick switcher: "atlas" ranks 🌍 Atlas first', first(quick('atlas')) === atlas.path);
    check('Quick switcher: highlight after the emoji', JSON.stringify(quick('atlas')[0].match.matches) === '[[3,8]]');
    check('Quick switcher: "cal" ranks 📅 Calendar first', first(quick('cal')) === calendar.path);
    check('[[: "atlas" ranks 🌍 Atlas first', first(await link('atlas')) === atlas.path);
    check('[[: "cal" ranks 📅 Calendar first', first(await link('cal')) === calendar.path);

    const accented = quick('cafe').find(r => r.file === cafe);
    const accentedNative = quickNative('cafe').find(r => r.file === cafe);
    check('Native accent-insensitive search is kept', !!accented && accented.match.score > accentedNative.match.score);
    check('Highlight with folder and emoji', JSON.stringify(accented?.match.matches) === '[[8,12]]');
    check('Emoji with variation selector', first(quick('atlas of hum')) === humanities.path);
    check('Emoji in the middle of the name', quick('map of').some(r => r.file === maps)
      && quick('map of').find(r => r.file === maps).match.score > quickNative('map of').find(r => r.file === maps).match.score);

    const alias = quick('world').find(r => r.type === 'alias');
    const aliasNative = quickNative('world').find(r => r.type === 'alias');
    check('Alias with emoji improved', alias?.alias === '🧭 World' && alias.match.score > aliasNative.match.score);
    const excluded = quick('atlas').find(r => r.file === hidden);
    check('Excluded file keeps its penalty', excluded?.downranked && excluded.match.score < -9);
    check('Unresolved link unchanged', JSON.stringify(quick('atlas').find(r => r.type === 'unresolved')?.match)
      === JSON.stringify(quickNative('atlas').find(r => r.type === 'unresolved')?.match));

    for (const query of ['🌍', '🌍 atlas', '']) {
      check(`Query "${query}" identical to native`, summarize(quick(query)) === summarize(quickNative(query)));
    }
    const ascii = ['Folder/Alpha.md', 'Beta.md', 'Folder/Gamma.md'].map(file);
    for (const query of ['a', 'alpha', 'folder', 'gm']) {
      check(`Without emojis, Quick switcher identical: ${query}`, summarize(quick(query, ascii)) === summarize(quickNative(query, ascii)));
      const runnable = { isCancelled: () => false };
      const patched = await manager.getFileSuggestions.call(linkContext(ascii), runnable, query);
      const native = await linkOriginal.call(linkContext(ascii), runnable, query);
      check(`Without emojis, [[ identical: ${query}`, summarize(patched) === summarize(native));
    }
  } catch (error) {
    failures.push(`Error: ${error?.message ?? error}`);
  } finally {
    await app.plugins.unloadPlugin(id);
    delete app.plugins.manifests[id];
  }

  check('Quick switcher restored', switcher.getSuggestions === quickOriginal);
  check('[[ suggestions restored', manager.getFileSuggestions === linkOriginal);
  check('Plugin unloaded', !app.plugins.plugins[id] && !app.plugins.manifests[id]);
  return { passed: passed.length, total: passed.length + failures.length, failures };
})
