"use client";

import { useCallback, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
} from "react-simple-maps";

import {
  discogsToNaturalEarth,
  naturalEarthToDiscogs,
} from "@/lib/geo/countryMapping";

interface WorldMapProps {
  /** Currently-selected country, in Discogs's vocabulary (e.g. "Japan", "US"). */
  selectedCountry: string | null;
  /** Fired when a country is clicked; receives the Discogs-formatted name. */
  onSelectCountry: (discogsName: string) => void;
}

const GEO_URL = "/maps/countries-110m.json";

// Equal Earth projection — modern, balanced areas, no Mercator distortion at
// the poles. The translation centers Africa/Europe to give Asia and the
// Americas equal screen weight.
const PROJECTION_CONFIG = {
  scale: 175,
  center: [10, 0] as [number, number],
};

interface NaturalEarthFeature {
  rsmKey: string;
  properties: { name: string };
}

export function WorldMap({ selectedCountry, onSelectCountry }: WorldMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const selectedNaturalEarth = selectedCountry
    ? discogsToNaturalEarth(selectedCountry)
    : null;

  const handleClick = useCallback(
    (naturalEarthName: string) => {
      onSelectCountry(naturalEarthToDiscogs(naturalEarthName));
    },
    [onSelectCountry],
  );

  return (
    <div className="relative h-full w-full">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={PROJECTION_CONFIG}
        width={800}
        height={420}
        className="h-full w-full"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212, 165, 116, 0.06) 0%, transparent 60%)",
        }}
      >
        <Sphere
          id="map-sphere"
          stroke="var(--color-border-strong)"
          strokeWidth={0.6}
          fill="transparent"
        />
        <Graticule
          stroke="var(--color-border)"
          strokeWidth={0.35}
          fill="transparent"
        />
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: NaturalEarthFeature[] }) =>
            geographies.map((geo) => {
              const name = geo.properties.name;
              const isSelected = name === selectedNaturalEarth;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={() => setHovered(name)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleClick(name)}
                  style={{
                    default: {
                      fill: isSelected
                        ? "var(--color-accent)"
                        : "var(--color-surface-elevated)",
                      stroke: isSelected
                        ? "var(--color-accent)"
                        : "var(--color-border-strong)",
                      strokeWidth: isSelected ? 0.8 : 0.4,
                      outline: "none",
                      transition: "fill 150ms ease, stroke 150ms ease",
                      cursor: "pointer",
                    },
                    hover: {
                      fill: isSelected
                        ? "var(--color-accent)"
                        : "var(--color-accent-muted)",
                      stroke: "var(--color-accent)",
                      strokeWidth: 0.8,
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill: "var(--color-accent)",
                      stroke: "var(--color-accent)",
                      strokeWidth: 0.8,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <div className="pointer-events-none absolute top-3 left-4 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
        <span className="text-(--color-foreground-muted)">Hover</span>
        {hovered ? (
          <>
            <span className="px-2 text-(--color-border-strong)">/</span>
            <span className="text-(--color-foreground)">{hovered}</span>
          </>
        ) : (
          <span className="px-2 text-(--color-border-strong)">/</span>
        )}
      </div>

      {selectedCountry ? (
        <div className="pointer-events-none absolute right-4 bottom-3 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="text-(--color-foreground-subtle)">Selected</span>
          <span className="px-2 text-(--color-border-strong)">/</span>
          <span className="text-(--color-accent)">{selectedCountry}</span>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-4 bottom-3 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          Click a country to dig
        </div>
      )}
    </div>
  );
}
