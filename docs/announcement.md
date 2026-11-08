# Obsidian Forum announcement

Status: **published**. Published: 2026-11-08. [Announcement](https://forum.obsidian.md/t/emoji-insensitive-search-ignore-emojis-in-quick-switcher-and-links/121717) · [Reply](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151/5).

The [Plugins category rules](https://forum.obsidian.md/t/about-the-plugins-category/116546) accept only plugins listed in the community directory. The [listing](https://community.obsidian.md/plugins/emoji-insensitive-search) was published the same day: version 0.1.0 passed the automated review with no errors and **Excellent** health, and its build was reproduced byte for byte. The only recommendation was to add GitHub artifact attestations to the release assets.

## Placement

1. The announcement was published in [Share & showcase → Plugins](https://forum.obsidian.md/c/share-showcase/plugins/22), with the disclaimer at the top and the tags `plugin-release`, `quick-switcher`, and `internal-links`. Post all future updates in that topic.
2. The short reply below was published in [An option to have quck switch ignore emojis](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151/5), the open feature request whose suggestion the plugin implements. The category rules allow a short message there that links to the announcement.

## New topic

### Emoji Insensitive Search: ignore emojis in Quick Switcher and [[ links

> ## Disclaimer
> Is this plugin **open source**? Yes
> Is this plugin completely **free**? Yes
> Is this plugin **vibe-coded** beyond the author's ability to comprehend how it works? Yes
> Community Directory: [Emoji Insensitive Search](https://community.obsidian.md/plugins/emoji-insensitive-search)

---

I like putting an emoji in front of my note names, but it pushes those notes down in the Quick Switcher. For example, typing `atlas` shows `Atlas Headrest` before `🌍 Atlas`.

A [feature request](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151) suggested ignoring emojis in the results when the query contains none, so I created **Emoji Insensitive Search** with the help of AI.

When your query has no emoji, the native **Quick Switcher (Ctrl+O / Cmd+O)** and **`[[` link suggestions** compare note names, paths, and aliases without their emojis:

- `atlas` puts **🌍 Atlas** first
- `cal` puts **📅 Calendar** ahead of **Calendar 2026**

If you type an emoji, search works as before. Highlights stay on the original name, and Obsidian's accent-insensitive search keeps working. No settings, and notes are never modified.

Requires Obsidian 1.15 or later. Tested on desktop, not yet on mobile.

[Install from the community directory](https://community.obsidian.md/plugins/emoji-insensitive-search) · [Source code and instructions on GitHub](https://github.com/TheWillyM4AK/obsidian-emoji-insensitive-search)

Feedback is welcome, especially from mobile users!

## Reply to the feature request

I had the same problem, and the suggestion above was the key: ignore emojis only when the query has none, with no extra option. I created **Emoji Insensitive Search** with AI assistance to do exactly that in the native Quick Switcher and `[[` suggestions: for example, `atlas` now puts **🌍 Atlas** ahead of **Atlas Headrest**. If you type an emoji, search works as before.

[Plugin and installation](https://community.obsidian.md/plugins/emoji-insensitive-search)

[More details in the announcement](https://forum.obsidian.md/t/emoji-insensitive-search-ignore-emojis-in-quick-switcher-and-links/121717)
