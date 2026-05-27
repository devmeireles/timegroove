"use client";

/**
 * Browser-side helpers for the /api/reconcile endpoint.
 *
 * Includes a small concurrency limiter so that reconciling 25 search rows
 * doesn't stampede the server (and through it, Spotify) — Spotify allows
 * ~180 req/min on Client Credentials, which is ample if we keep 4 in flight.
 */

import type { NormalizedRelease } from "@/types/discogs";
import type { EnrichedRelease } from "@/types/reconciliation";

export class ReconcileRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ReconcileRequestError";
  }
}

export async function reconcile(
  release: NormalizedRelease,
  signal?: AbortSignal,
): Promise<EnrichedRelease> {
  const response = await fetch("/api/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ release }),
    signal,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // body wasn't JSON; keep status line
    }
    throw new ReconcileRequestError(detail, response.status);
  }

  return (await response.json()) as EnrichedRelease;
}

/**
 * Concurrency-limited task runner. Resolves in input order with one entry
 * per input — the entry is either `{ ok: true, value }` or `{ ok: false,
 * error }` so a single failure can't sink the whole batch.
 */
export type SettledOk<T> = { ok: true; value: T };
export type SettledErr = { ok: false; error: Error };
export type Settled<T> = SettledOk<T> | SettledErr;

export async function runWithLimit<TIn, TOut>(
  items: TIn[],
  limit: number,
  worker: (item: TIn, index: number) => Promise<TOut>,
): Promise<Settled<TOut>[]> {
  const results: Settled<TOut>[] = new Array(items.length);
  let cursor = 0;

  async function next(): Promise<void> {
    const current = cursor++;
    if (current >= items.length) return;
    const item = items[current]!;
    try {
      results[current] = { ok: true, value: await worker(item, current) };
    } catch (err) {
      results[current] = {
        ok: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
    await next();
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => next(),
  );
  await Promise.all(workers);
  return results;
}
