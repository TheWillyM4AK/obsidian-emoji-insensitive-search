export type SearchSurface = 'quickSwitcher' | 'wikilinks';

export function incompatibilityNotice(surface: SearchSurface): string {
  const label = surface === 'quickSwitcher' ? 'Quick switcher' : '[[ suggestions';
  return `Emoji Insensitive Search: this Obsidian version cannot ignore emojis in ${label}. Native search remains active.`;
}
