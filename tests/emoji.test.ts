import { describe, expect, it } from "vitest";
import { hasEmoji, remapMatches, stripEmoji } from "../src/emoji";

describe("hasEmoji", () => {
  it.each([
    "🌍 Atlas", "🏛️ Atlas of Humanities", "Plan 💪🏻", "🇪🇸 España", "1️⃣ One", "👨‍👩‍👧 Family",
  ])("detects %s", text => expect(hasEmoji(text)).toBe(true));

  it.each(["Atlas", "Árbol", "Pingüino", "Año", "¡Hola!", "2026-11-07 Meeting", "#tag"])(
    "does not mistake %s for an emoji", text => expect(hasEmoji(text)).toBe(false),
  );
});

describe("stripEmoji", () => {
  it.each([
    ["🌍 Atlas", "Atlas"],
    ["🏛️ Atlas of Humanities", "Atlas of Humanities"],
    ["Workout plan 💪🏻", "Workout plan"],
    ["Map 🗺️ of maps", "Map of maps"],
    ["🇪🇸 España", "España"],
    ["👨‍👩‍👧 Family", "Family"],
    ["1️⃣ One", "One"],
    ["notes/🌲 Plants", "notes/Plants"],
    ["📒 Manuals 🔧/🔌 Technology", "Manuals/Technology"],
    ["🎊", ""],
    ["Café", "Café"],
  ])("%s → %s", (input, expected) => expect(stripEmoji(input).text).toBe(expected));

  it("keeps the original positions in UTF-16 units", () => {
    const stripped = stripEmoji("🌍 Atlas");
    expect(stripped.starts).toEqual([3, 4, 5, 6, 7]);
    expect(stripped.ends).toEqual([4, 5, 6, 7, 8]);
  });

  it("groups letters with decomposed accents", () => {
    const stripped = stripEmoji("🌳 Árbol");
    expect(stripped.text).toBe("Árbol");
    expect(stripped.starts.slice(0, 2)).toEqual([3, 3]);
    expect(stripped.ends.slice(0, 2)).toEqual([5, 5]);
  });
});

describe("remapMatches", () => {
  it("maps and merges highlighted ranges", () => {
    const stripped = stripEmoji("Map 🗺️ of maps");
    expect(remapMatches([[0, 3]], stripped)).toEqual([[0, 3]]);
    expect(remapMatches([[4, 6]], stripped)).toEqual([[8, 10]]);
    expect(remapMatches([[2, 5], [3, 4]], stripped)).toEqual([[2, 9]]);
  });

  it("drops empty or invalid ranges", () => {
    const stripped = stripEmoji("🌍 Atlas");
    expect(remapMatches([[2, 2], [Number.NaN, 1], [4, 99]], stripped)).toEqual([[7, 8]]);
  });
});
