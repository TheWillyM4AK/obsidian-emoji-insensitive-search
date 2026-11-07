# Emoji Insensitive Search

If you put an emoji in front of your note names (`🌍 Atlas`, `📅 Calendar`), Obsidian's **Quick switcher (Ctrl+O / Cmd+O)** and **`[[` link suggestions** still find them, but rank them below notes whose name starts directly with what you type.

This plugin makes both searches ignore emojis in note names and aliases **when your query contains no emoji**, as proposed on the [Obsidian forum](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151). If you type an emoji, search works exactly as before.

| You type | First result without the plugin | First result with the plugin |
| --- | --- | --- |
| `atlas` | `Atlas Headrest` | `🌍 Atlas` |
| `cal` | `Calendar 2026` | `📅 Calendar` |
| `🌍` | `🌍 Atlas` | `🌍 Atlas` (unchanged) |

## How it works

- Rescores Obsidian's own results whose name, path, or alias contains emojis, comparing them without the emoji and the space that separated it (`🌲 Plants` is compared as `Plants`). If the native score is better, it is kept.
- Uses Obsidian's own fuzzy search, so the rest of its behavior is preserved, including the accent-insensitive search introduced in Obsidian 1.15.
- Highlights are shown on the original name, emoji included.
- Respects native attachment options and the "Excluded files" penalty. Unresolved links, bookmarks, headings, blocks, and empty queries are left unchanged.
- No settings and no network requests. Notes, filenames, frontmatter, and aliases are never modified.

## Installation

- **With BRAT:** add the beta plugin `TheWillyM4AK/obsidian-emoji-insensitive-search`.
- **Manually:** download `main.js` and `manifest.json` from the [latest release](https://github.com/TheWillyM4AK/obsidian-emoji-insensitive-search/releases/latest), create `.obsidian/plugins/emoji-insensitive-search/` inside your vault, and copy both files into it.

Then enable **Emoji Insensitive Search** in **Settings → Community plugins**.

Use Ctrl+O and `[[` as usual. Disable the plugin to restore the native behavior.

## Compatibility

- Requires **Obsidian 1.15** or later. Verified on desktop with Obsidian 1.15.1, using the actual native methods with fictional files in memory.
- Designed for desktop and mobile, with no platform-specific dependencies. Not yet tested on mobile.
- The integration wraps internal Obsidian methods, because the public API offers no extension point for these searches. If an update changes those methods or the shape of their results, the plugin falls back to native search and shows a notice once. Disabling the plugin restores the original methods.

## Development

Requires **Node.js 24 or later**.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Unit tests cover emoji stripping (variation selectors, skin tones, flags, ZWJ sequences, and keycaps), highlight positions, scoring, ordering, and reversible patches.

`tests/native.integration.js` checks the plugin against the actual native methods inside Obsidian. It is an expression that evaluates to an async function `(app, source)`: it loads the given `main.js` in memory only, runs the checks with fictional files and aliases, and unloads the plugin at the end, without writing to the vault. The plugin must not be installed in that vault. Run it with the Obsidian CLI (`obsidian eval`). Because the CLI does not wait for async functions, write the result to a file:

```js
(async () => {
  const fs = require('fs');
  const run = eval(fs.readFileSync('PATH/tests/native.integration.js', 'utf8'));
  const result = await run(app, fs.readFileSync('PATH/main.js', 'utf8'));
  fs.writeFileSync('PATH/result.json', JSON.stringify(result, null, 1));
})();
```

All checks must pass, with an empty `failures` array.

## License

[MIT](LICENSE) · TheWillyM4AK. Built with the [Obsidian API](https://github.com/obsidianmd/obsidian-api).
