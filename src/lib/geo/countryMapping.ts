/**
 * Translation between Natural Earth country names (used by the world-atlas
 * topojson under `properties.name`) and the country strings Discogs expects
 * in its `/database/search?country=...` filter.
 *
 * Most names line up exactly ("Brazil", "Japan", "Argentina"); this file
 * captures only the well-known mismatches. Anything not in the map falls
 * through untouched.
 *
 * Out of scope: historical states (East Germany, Yugoslavia, USSR,
 * Czechoslovakia) don't appear on the modern world map at all, so users
 * can't surface those scenes via the map. The text-based search would, but
 * we removed it intentionally.
 */

const NATURAL_EARTH_TO_DISCOGS: Record<string, string> = {
  "United States of America": "US",
  "United Kingdom": "UK",
  "Russian Federation": "Russia",
  "Czechia": "Czech Republic",
  "Republic of Korea": "South Korea",
  "Korea, Republic of": "South Korea",
  "Dem. Rep. Korea": "North Korea",
  "Democratic People's Republic of Korea": "North Korea",
  "Iran (Islamic Republic of)": "Iran",
  "Syrian Arab Republic": "Syria",
  "Lao People's Democratic Republic": "Laos",
  "Viet Nam": "Vietnam",
  "Bolivia (Plurinational State of)": "Bolivia",
  "Venezuela (Bolivarian Republic of)": "Venezuela",
  "Tanzania, United Republic of": "Tanzania",
  "Côte d'Ivoire": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Eswatini": "Swaziland",
  "Republic of Congo": "Congo",
  "Dem. Rep. Congo": "Congo, Democratic Republic of the",
};

export function naturalEarthToDiscogs(naturalEarthName: string): string {
  return NATURAL_EARTH_TO_DISCOGS[naturalEarthName] ?? naturalEarthName;
}

/** Reverse direction: given a Discogs country, find the Natural Earth name
 * (used to keep the map highlight in sync). Returns the input if no
 * translation is needed. */
const DISCOGS_TO_NATURAL_EARTH: Record<string, string> = Object.fromEntries(
  Object.entries(NATURAL_EARTH_TO_DISCOGS).map(([ne, d]) => [d, ne]),
);

export function discogsToNaturalEarth(discogsCountry: string): string {
  return DISCOGS_TO_NATURAL_EARTH[discogsCountry] ?? discogsCountry;
}
