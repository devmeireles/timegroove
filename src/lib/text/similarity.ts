/**
 * String-similarity primitives used by the reconciliation scorer.
 *
 * We use two complementary metrics:
 *
 *   - tokenSetDice: bag-of-tokens Sørensen-Dice. Robust to word reordering
 *     ("Bowie David" ↔ "David Bowie") and to extra/missing tokens
 *     ("Larks Tongues in Aspic" ↔ "Larks Tongues in Aspic 40th Anniversary").
 *
 *   - jaroWinkler: character-level fuzzy match with a prefix bonus. Better
 *     for typos and transliteration ("Bjork" ↔ "Björk" after normalization).
 *
 * The scorer takes max(dice, jw) so misspellings *or* re-orderings both pass.
 */

import { tokenize } from "./normalize";

/**
 * Sørensen-Dice on token sets. Returns 0..1.
 *   2·|A∩B| / (|A|+|B|)
 * Both strings are normalized (lowercase, diacritic-stripped) before tokenization.
 */
export function tokenSetDice(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  return (2 * intersection) / (tokensA.size + tokensB.size);
}

/**
 * Jaro similarity, the building block for Jaro-Winkler. 0..1, character-level.
 */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches += 1;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions += 1;
    k += 1;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) /
    3
  );
}

/**
 * Jaro-Winkler with a prefix bonus (boost when the first up-to-4 characters
 * match). Operates on the *normalized* form so accents/case don't matter.
 */
export function jaroWinkler(a: string, b: string): number {
  const normalizedA = a
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const normalizedB = b
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

  const jaroScore = jaro(normalizedA, normalizedB);
  if (jaroScore < 0.7) return jaroScore;

  const prefixLen = Math.min(
    4,
    commonPrefixLength(normalizedA, normalizedB),
  );
  return jaroScore + prefixLen * 0.1 * (1 - jaroScore);
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) return i;
  }
  return max;
}

/** Best-of-both: returns max(tokenSetDice, jaroWinkler). 0..1. */
export function similarity(a: string, b: string): number {
  return Math.max(tokenSetDice(a, b), jaroWinkler(a, b));
}
