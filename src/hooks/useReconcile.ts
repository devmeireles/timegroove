"use client";

import { useEffect, useRef, useState } from "react";

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
 * Merge a new releases array into the existing state map, preserving any
 * already-resolved entries. Entries that no longer appear in `releases`
 * (e.g. after a fresh search swaps the list) are dropped; new entries are
 * seeded as "loading". Same function handles both fresh searches and
 * pagination appends.
 */
function mergeMap(
  prev: Map<number, ReconcileState>,
  releases: readonly NormalizedRelease[],
): Map<number, ReconcileState> {
  const next = new Map<number, ReconcileState>();
  for (const r of releases) {
    next.set(r.id, prev.get(r.id) ?? { status: "loading" });
  }
  return next;
}

/**
 * Fan out reconciliation calls for a batch of search results with a
 * concurrency cap. Survives pagination: existing resolved entries stay
 * resolved when the releases array grows.
 *
 * An in-flight ref tracks which release ids already have a fetch in
 * progress so the effect doesn't fire duplicate calls when state ticks.
 * The actual setState in each promise short-circuits if the release no
 * longer exists in the current map (e.g. a stale fetch from a previous
 * search returning after the user moved on).
 */
export function useReconcile(
  releases: readonly NormalizedRelease[],
): Map<number, ReconcileState> {
  const [state, setState] = useState<State>(() => ({
    key: releases,
    map: seedMap(releases),
  }));

  if (state.key !== releases) {
    setState({ key: releases, map: mergeMap(state.map, releases) });
  }

  const inFlight = useRef<Set<number>>(new Set());

  useEffect(() => {
    const toReconcile: NormalizedRelease[] = [];
    for (const r of releases) {
      if (inFlight.current.has(r.id)) continue;
      const status = state.map.get(r.id)?.status;
      if (status === "loading") toReconcile.push(r);
    }
    if (toReconcile.length === 0) return;

    for (const r of toReconcile) inFlight.current.add(r.id);

    void runWithLimit<NormalizedRelease, void>(
      toReconcile,
      CONCURRENCY,
      async (release) => {
        try {
          const enriched = await reconcile(release);
          setState((prev) => {
            const existing = prev.map.get(release.id);
            if (!existing || existing.status !== "loading") return prev;
            const next = new Map(prev.map);
            next.set(release.id, { status: enriched.status, enriched });
            return { key: prev.key, map: next };
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          const message = err instanceof Error ? err.message : "Unknown error";
          setState((prev) => {
            const existing = prev.map.get(release.id);
            if (!existing || existing.status !== "loading") return prev;
            const next = new Map(prev.map);
            next.set(release.id, { status: "error", message });
            return { key: prev.key, map: next };
          });
        } finally {
          inFlight.current.delete(release.id);
        }
      },
    );
  }, [releases, state.map]);

  return state.map;
}
