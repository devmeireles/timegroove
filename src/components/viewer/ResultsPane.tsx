"use client";

import { JsonViewer } from "./JsonViewer";
import type { NormalizedSearchResponse } from "@/types/discogs";

interface ResultsPaneProps {
  data: NormalizedSearchResponse | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Distil the normalized response into the fields the time-capsule cares
 * about. Keeps the JSON viewer focused, not a dump of the upstream payload.
 */
function shape(data: NormalizedSearchResponse) {
  return {
    pagination: data.pagination,
    query: data.query,
    results: data.results.map((row) => ({
      discogs_id: row.id,
      type: row.type,
      title: row.title,
      year: row.year,
      country: row.country,
      label: row.label,
      genre: row.genre,
      style: row.style,
      format: row.format,
      catno: row.catno,
      discogs_url: row.discogsUrl,
    })),
  };
}

export function ResultsPane({ data, isLoading, error }: ResultsPaneProps) {
  if (error) return <ErrorState message={error} />;
  if (data) return <JsonViewer data={shape(data)} />;
  if (isLoading) return <SkeletonState />;
  return <EmptyState />;
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 font-mono text-sm text-(--color-foreground-muted)">
      <p className="text-(--color-foreground-subtle)">
        {"// Pick a country on the map, set a year and a genre."}
      </p>
      <p className="text-(--color-foreground-subtle)">
        {"// Try "}
        <span className="text-(--color-accent)">Brazil · 1993</span>
        {", "}
        <span className="text-(--color-accent)">Japan · 1985 · Jazz</span>
        {", or "}
        <span className="text-(--color-accent)">US · 1977 · Rock</span>.
      </p>
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-2 font-mono text-sm text-(--color-foreground-subtle)">
      <p>{"{"}</p>
      <p className="pl-4">{'"loading": true,'}</p>
      <p className="pl-4">{'"hint": "fetching from Discogs…"'}</p>
      <p>{"}"}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-[12.5px] text-red-300">
      <p className="font-semibold uppercase tracking-[0.18em] text-[10px] text-red-400">
        Request failed
      </p>
      <p className="mt-1.5 whitespace-pre-wrap">{message}</p>
    </div>
  );
}
