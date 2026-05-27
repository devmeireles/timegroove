"use client";

import { useCallback, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
  ZoomableGroup,
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
  /** Pixels of right-edge inset to leave clear for an overlay (e.g. results
   * panel). Shifts the zoom controls and the bottom-right status line. */
  rightInset?: number;
}

const GEO_URL = "/maps/countries-110m.json";

const INITIAL_CENTER: [number, number] = [10, 0];
const INITIAL_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.6;

const PROJECTION_CONFIG = {
  scale: 175,
  center: INITIAL_CENTER,
};

interface NaturalEarthFeature {
  rsmKey: string;
  properties: { name: string };
}

interface MapPosition {
  coordinates: [number, number];
  zoom: number;
}

export function WorldMap({
  selectedCountry,
  onSelectCountry,
  rightInset = 0,
}: WorldMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [position, setPosition] = useState<MapPosition>({
    coordinates: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });

  const selectedNaturalEarth = selectedCountry
    ? discogsToNaturalEarth(selectedCountry)
    : null;

  const handleClick = useCallback(
    (naturalEarthName: string) => {
      onSelectCountry(naturalEarthToDiscogs(naturalEarthName));
    },
    [onSelectCountry],
  );

  const zoomIn = useCallback(() => {
    setPosition((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * ZOOM_STEP, MAX_ZOOM),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setPosition((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom / ZOOM_STEP, MIN_ZOOM),
    }));
  }, []);

  const zoomReset = useCallback(() => {
    setPosition({ coordinates: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  }, []);

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
        <ZoomableGroup
          center={position.coordinates}
          zoom={position.zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={(next) => setPosition(next)}
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
        </ZoomableGroup>
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

      <ZoomControls
        zoom={position.zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={zoomReset}
        rightInset={rightInset}
      />

      {selectedCountry ? (
        <div
          className="pointer-events-none absolute bottom-3 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ right: 16 + rightInset }}
        >
          <span className="text-(--color-foreground-subtle)">Selected</span>
          <span className="px-2 text-(--color-border-strong)">/</span>
          <span className="text-(--color-accent)">{selectedCountry}</span>
        </div>
      ) : (
        <div
          className="pointer-events-none absolute bottom-3 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
          style={{ right: 16 + rightInset }}
        >
          Click a country to dig · drag to pan · scroll to zoom
        </div>
      )}
    </div>
  );
}

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  rightInset?: number;
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  rightInset = 0,
}: ZoomControlsProps) {
  return (
    <div
      className="absolute top-3 flex flex-col gap-1"
      style={{ right: 12 + rightInset }}
    >
      <ZoomButton
        label="Zoom in"
        onClick={onZoomIn}
        disabled={zoom >= MAX_ZOOM - 0.01}
      >
            <Plus size={12} aria-hidden="true" />
      </ZoomButton>
      <ZoomButton
        label="Zoom out"
        onClick={onZoomOut}
        disabled={zoom <= MIN_ZOOM + 0.01}
      >
            <Minus size={12} aria-hidden="true" />
      </ZoomButton>
      <ZoomButton
        label="Reset view"
        onClick={onReset}
        disabled={zoom === INITIAL_ZOOM}
      >
            <RotateCcw size={12} aria-hidden="true" />
      </ZoomButton>
    </div>
  );
}

interface ZoomButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function ZoomButton({ label, onClick, disabled, children }: ZoomButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) bg-surface/85 text-(--color-foreground-muted) backdrop-blur-sm transition-colors hover:border-(--color-accent-muted) hover:text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-(--color-border) disabled:hover:text-(--color-foreground-muted)"
    >
      {children}
    </button>
  );
}
