# Obsidian Forum announcement

Status: **draft**. The [Plugins category rules](https://forum.obsidian.md/t/about-the-plugins-category/116546) accept only plugins listed in the [community directory](https://community.obsidian.md), so the announcement waits for the listing.

## Placement

1. Publish the announcement in [Share & showcase → Plugins](https://forum.obsidian.md/c/share-showcase/plugins/22), with the disclaimer at the top. Post all future updates in that topic.
2. Then post the short reply below in [An option to have quck switch ignore emojis](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151), the open feature request whose suggestion the plugin implements. The category rules allow a short message there that links to the announcement.

## New topic

### Emoji Insensitive Search: ignore emojis in Quick Switcher and [[ links

> ## Disclaimer
> Is this plugin **open source**? Yes
> Is this plugin completely **free**? Yes
> Is this plugin **vibe-coded** beyond the author's ability to comprehend how it works? Yes
> Community Directory: [Emoji Insensitive Search](https://community.obsidian.md/plugins/emoji-insensitive-search)

---

I like putting an emoji in front of my note names (`🌍 Atlas`, `📅 Calendar`), but it pushes those notes down in the Quick Switcher. Typing `atlas` showed `Atlas Headrest` before `🌍 Atlas`.

A [feature request](https://forum.obsidian.md/t/an-option-to-have-quck-switch-ignore-emojis/32151) suggested ignoring emojis in the results when the query contains none, so I created **Emoji Insensitive Search** with the help of AI.

When your query has no emoji, the native **Quick Switcher (Ctrl+O / Cmd+O)** and **`[[` link suggestions** compare note names, paths, and aliases without their emojis:

- `atlas` puts **🌍 Atlas** first
- `cal` puts **📅 Calendar** ahead of **Calendar 2026**

If you type an emoji, search works as before. Highlights stay on the original name, and Obsidian's accent-insensitive search keeps working. No settings, and notes are never modified.

Requires Obsidian 1.15 or later. Tested on desktop, not yet on mobile.

[Install from the community directory](https://community.obsidian.md/plugins/emoji-insensitive-search) · [GitHub and English/Spanish instructions](https://github.com/TheWillyM4AK/obsidian-emoji-insensitive-search)

Feedback is welcome, especially from mobile users!

## Reply to the feature request

I had the same problem, and the suggestion above was the key: ignore emojis only when the query has none, with no extra option. I created **Emoji Insensitive Search** with AI assistance to do exactly that in the native Quick Switcher and `[[` suggestions: `atlas` now puts **🌍 Atlas** first. If you type an emoji, search works as before.

[Plugin and installation](https://community.obsidian.md/plugins/emoji-insensitive-search)

[More details in the announcement](ANNOUNCEMENT_URL)
