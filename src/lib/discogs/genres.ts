/**
 * Discogs's top-level genre taxonomy is a fixed, well-known list (~15 values).
 * Source: https://www.discogs.com/help/doc/submission-guidelines-genres-and-styles
 *
 * Keeping the list hardcoded avoids a startup roundtrip and makes the
 * combobox feel snappy. New genres almost never get added by Discogs.
 */

export const DISCOGS_GENRES = [
  "Blues",
  "Brass & Military",
  "Children's",
  "Classical",
  "Electronic",
  "Folk, World, & Country",
  "Funk / Soul",
  "Hip Hop",
  "Jazz",
  "Latin",
  "Non-Music",
  "Pop",
  "Reggae",
  "Rock",
  "Stage & Screen",
] as const;

export type DiscogsGenre = (typeof DISCOGS_GENRES)[number];

export function isDiscogsGenre(value: string): value is DiscogsGenre {
  return (DISCOGS_GENRES as readonly string[]).includes(value);
}
