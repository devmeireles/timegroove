"use client";

import { JsonViewer } from "./JsonViewer";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

interface ResultsPaneProps {
  data: NormalizedSearchResponse | null;
  isLoading: boolean;
  error: string | null;
  /** Stable shape of the most recently submitted query, for the header. */
  lastQuery: DiscogsSearchFilters | null;
}

/**
 * Distil the normalized response into exactly the fields the brief calls out
 * (title, year, country, label, genre, style, type, format, Discogs ID).
 * Keeping the JSON viewer focused on these fields makes the archive feel
 * curated instead of dumping the upstream payload.
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

function formatQuerySummary(query: ResultsPaneProps["lastQuery"]): string {
  if (!query) return "no query yet";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "" && v !== null)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length === 0 ? "no filters" : parts.join("  ·  ");
}

export function ResultsPane({
  data,
  isLoading,
  error,
  lastQuery,
}: ResultsPaneProps) {
  return (
    <section className="flex h-full flex-1 flex-col bg-(--color-background)">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-(--color-border) px-6 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            Response
          </p>
          <p
            className="mt-0.5 truncate font-mono text-[11px] text-(--color-foreground-muted)"
            title={formatQuerySummary(lastQuery)}
          >
            {formatQuerySummary(lastQuery)}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          {isLoading ? <span className="text-(--color-accent)">Loading…</span> : null}
          {data ? <span>{data.pagination.items.toLocaleString()} hits</span> : null}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5">
        {error ? <ErrorState message={error} /> : null}
        {!error && data ? <JsonViewer data={shape(data)} /> : null}
        {!error && !data && !isLoading ? <EmptyState /> : null}
        {!error && !data && isLoading ? <SkeletonState /> : null}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 font-mono text-sm text-(--color-foreground-muted)">
      <p className="text-(--color-foreground-subtle)">
        {"// Pick a year, country, genre or style."}
      </p>
      <p className="text-(--color-foreground-subtle)">
        {"// Try "}
        <span className="text-(--color-accent)">Brazil 1993</span>
        {", "}
        <span className="text-(--color-accent)">Japan 1985 jazz</span>
        {", or "}
        <span className="text-(--color-accent)">USA 1977 punk</span>.
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
