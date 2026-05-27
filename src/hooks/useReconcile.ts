"use client";

import { useEffect, useState } from "react";

import { reconcile, runWithLimit } from "@/lib/clientReconcile";
import type { NormalizedRelease } from "@/types/discogs";
import type { EnrichedRelease, MappingStatus } from "@/types/reconciliation";

const CONCURRENCY = 4;

export type ReconcileState =
  | { status: "loading" }
  | { status: MappingStatus; enriched: EnrichedRelease }
  | { status: "error"; message: string };

interface State {
  key: readonly NormalizedRelease[];
  map: Map<number, ReconcileState>;
}

function seedMap(
  releases: readonly NormalizedRelease[],
): Map<number, ReconcileState> {
  const m = new Map<number, ReconcileState>();
  for (const r of releases) m.set(r.id, { status: "loading" });
  return m;
}

/**
 * Fan out reconciliation calls for a batch of search results with a
 * concurrency cap. React's "reset state via setState during render" pattern
 * is used to flush stale entries when the releases array identity changes;
 * the effect only does async I/O so the lint rule stays happy.
 */
export function useReconcile(
  releases: readonly NormalizedRelease[],
): Map<number, ReconcileState> {
  const [state, setState] = useState<State>(() => ({
    key: releases,
    map: seedMap(releases),
  }));

  // Derive-from-props reset. React permits setState during render when it's
  // a function of incoming props; it discards the current render and starts
  // again with the new state — no flicker.
  if (state.key !== releases) {
    setState({ key: releases, map: seedMap(releases) });
  }

  useEffect(() => {
    const controller = new AbortController();
    if (releases.length === 0) {
      return () => controller.abort();
    }

    void runWithLimit<NormalizedRelease, void>(
      [...releases],
      CONCURRENCY,
      async (release) => {
        try {
          const enriched = await reconcile(release, controller.signal);
          if (controller.signal.aborted) return;
          setState((prev) => {
            if (prev.key !== releases) return prev;
            const next = new Map(prev.map);
            next.set(release.id, { status: enriched.status, enriched });
            return { key: prev.key, map: next };
          });
        } catch (err) {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          const message = err instanceof Error ? err.message : "Unknown error";
          setState((prev) => {
            if (prev.key !== releases) return prev;
            const next = new Map(prev.map);
            next.set(release.id, { status: "error", message });
            return { key: prev.key, map: next };
          });
        }
      },
    );

    return () => controller.abort();
  }, [releases]);

  return state.map;
}
