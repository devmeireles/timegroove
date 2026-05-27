"use client";

import { useEffect, useState } from "react";

import { Dialog } from "@/components/details/Dialog";
import { fetchDiscogsDetail } from "@/lib/clientDetail";
import { splitDiscogsTitle } from "@/lib/text/normalize";
import {
  fetchWikipediaSummary,
  type WikipediaSummary,
} from "@/lib/wikipedia";
import type {
  NormalizedDiscogsDetail,
  NormalizedRelease,
  NormalizedTrack,
} from "@/types/discogs";
import type { EnrichedSpotify } from "@/types/reconciliation";

interface AlbumDetailDialogProps {
  release: NormalizedRelease | null;
  /** Reconciled Spotify metadata, when available. Drives the cover image
   * (matching the list card) and the Spotify external link. */
  spotify: EnrichedSpotify | null;
  onClose: () => void;
}

type DetailState =
  | { kind: "loading" }
  | { kind: "ready"; detail: NormalizedDiscogsDetail }
  | { kind: "error"; message: string };

type WikiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; summary: WikipediaSummary }
  | { kind: "missing" };

export function AlbumDetailDialog({
  release,
  spotify,
  onClose,
}: AlbumDetailDialogProps) {
  // Single state object keyed on release identity, so we can reset the
  // detail/wiki sub-states via setState-during-render (React's "derived
  // from props" pattern) and keep the effect free of synchronous setState
  // calls — that's what the React 19 set-state-in-effect rule wants.
  const [state, setState] = useState<{
    key: NormalizedRelease | null;
    detail: DetailState;
    wiki: WikiState;
  }>(() => ({
    key: release,
    detail: { kind: "loading" },
    wiki: { kind: "idle" },
  }));

  if (state.key !== release) {
    setState({
      key: release,
      detail: { kind: "loading" },
      wiki: { kind: "idle" },
    });
  }

  useEffect(() => {
    if (!release) return;
    const controller = new AbortController();

    const type: "release" | "master" =
      release.type === "master" ? "master" : "release";

    fetchDiscogsDetail(release.id, type, controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setState((prev) =>
          prev.key === release
            ? { ...prev, detail: { kind: "ready", detail: d }, wiki: { kind: "loading" } }
            : prev,
        );

        // Once we have a clean artist+title from Discogs detail, query
        // Wikipedia. The combined string is more reliable than the
        // search-row "Artist - Album" parse.
        const artist = d.artists[0]?.name;
        const title = d.title;
        if (!artist || !title) {
          setState((prev) =>
            prev.key === release ? { ...prev, wiki: { kind: "missing" } } : prev,
          );
          return;
        }

        fetchWikipediaSummary(`${artist} ${title}`, controller.signal)
          .then((summary) => {
            if (controller.signal.aborted) return;
            setState((prev) =>
              prev.key === release
                ? {
                    ...prev,
                    wiki: summary
                      ? { kind: "ready", summary }
                      : { kind: "missing" },
                  }
                : prev,
            );
          })
          .catch(() => {
            if (controller.signal.aborted) return;
            setState((prev) =>
              prev.key === release
                ? { ...prev, wiki: { kind: "missing" } }
                : prev,
            );
          });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setState((prev) =>
          prev.key === release
            ? { ...prev, detail: { kind: "error", message } }
            : prev,
        );
      });

    return () => controller.abort();
  }, [release]);

  const detail = state.detail;
  const wiki = state.wiki;

  return (
    <Dialog
      open={release != null}
      onClose={onClose}
      ariaLabel="Album details"
    >
      {release ? (
        <DialogBody
          release={release}
          spotify={spotify}
          detail={detail}
          wiki={wiki}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function DialogBody({
  release,
  spotify,
  detail,
  wiki,
  onClose,
}: {
  release: NormalizedRelease;
  spotify: EnrichedSpotify | null;
  detail: DetailState;
  wiki: WikiState;
  onClose: () => void;
}) {
  const fallbackParsed = splitDiscogsTitle(release.title ?? "");
  const ready = detail.kind === "ready" ? detail.detail : null;

  // Prefer the structured detail fields once they land; before then, fall
  // back to whatever we already had from the search row.
  const title = ready?.title ?? fallbackParsed.album ?? release.title ?? "Untitled";
  const artist = ready?.artists[0]?.name ?? fallbackParsed.artist ?? null;
  const year = ready?.year ?? release.year;
  const country = ready?.country ?? release.country;
  // Cover priority matches the list card exactly so the same image shows up
  // in both surfaces — Spotify first, then whatever Discogs gave us on the
  // search row. We intentionally don't dip into detail.images here.
  const coverUrl =
    spotify?.images[0]?.url ??
    release.coverImage ??
    release.thumb ??
    null;

  return (
    <div className="flex max-h-[85vh] flex-col">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-(--color-border) px-6 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-(--color-accent)">
            Time&nbsp;Capsule
          </p>
          <p className="mt-1 font-mono text-[11px] text-(--color-foreground-subtle)">
            {ready?.discogsType === "master" ? "Master release" : "Release"}
            {ready?.id ? ` · #${ready.id}` : ""}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Cover url={coverUrl} title={title} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <h2 className="text-xl leading-tight tracking-tight text-(--color-foreground)">
                {title}
              </h2>
              <p className="mt-1 font-mono text-[12px] text-(--color-foreground-muted)">
                {artist ?? "Unknown artist"}
              </p>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px]">
              {year != null ? (
                <Row label="Released">
                  {ready?.released ?? String(year)}
                </Row>
              ) : null}
              {country ? <Row label="Country">{country}</Row> : null}
              {(ready?.genres.length ?? 0) > 0 ? (
                <Row label="Genres">{ready!.genres.join(", ")}</Row>
              ) : null}
              {(ready?.styles.length ?? 0) > 0 ? (
                <Row label="Styles">{ready!.styles.join(", ")}</Row>
              ) : null}
              {(ready?.labels.length ?? 0) > 0 ? (
                <Row label="Label">
                  {ready!.labels
                    .map((l) => (l.catno ? `${l.name} (${l.catno})` : l.name))
                    .join(" · ")}
                </Row>
              ) : null}
              {(ready?.formats.length ?? 0) > 0 ? (
                <Row label="Format">
                  {ready!.formats
                    .map((f) =>
                      f.descriptions.length > 0
                        ? `${f.name} — ${f.descriptions.join(", ")}`
                        : f.name,
                    )
                    .join(" · ")}
                </Row>
              ) : null}
            </dl>

            {ready?.discogsUrl || spotify?.externalUrl ? (
              <div className="flex flex-wrap items-center gap-4">
                {ready?.discogsUrl ? (
                  <ExternalLink href={ready.discogsUrl} label="discogs" />
                ) : null}
                {spotify?.externalUrl ? (
                  <ExternalLink
                    href={spotify.externalUrl}
                    label="spotify"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {wiki.kind === "missing" ? null : (
          <Section title="Historical context">
            <ContextBlock wiki={wiki} />
          </Section>
        )}

        {ready?.notes ? (
          <Section title="Release notes">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-(--color-foreground-muted)">
              {ready.notes}
            </p>
          </Section>
        ) : null}

        <Section title="Tracklist">
          <Tracklist
            tracks={ready?.tracklist ?? null}
            loading={detail.kind === "loading"}
          />
        </Section>

        {ready?.community ? (
          <Section title="Community">
            <p className="font-mono text-[11px] text-(--color-foreground-muted)">
              <span>have </span>
              <span className="text-(--color-foreground)">
                {ready.community.have.toLocaleString()}
              </span>
              <span className="px-2 text-(--color-border-strong)">·</span>
              <span>want </span>
              <span className="text-(--color-foreground)">
                {ready.community.want.toLocaleString()}
              </span>
              {ready.community.rating != null ? (
                <>
                  <span className="px-2 text-(--color-border-strong)">·</span>
                  <span>rating </span>
                  <span className="text-(--color-foreground)">
                    {ready.community.rating.toFixed(2)}/5
                  </span>
                </>
              ) : null}
            </p>
          </Section>
        ) : null}

        {detail.kind === "error" ? (
          <Section title="Error">
            <p className="font-mono text-[11px] text-red-400">
              {detail.message}
            </p>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Cover({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        loading="lazy"
        className="h-40 w-40 shrink-0 rounded-sm border border-(--color-border) object-cover sm:h-48 sm:w-48"
      />
    );
  }
  return (
    <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle) sm:h-48 sm:w-48">
      no art
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-(--color-foreground-muted)">
        {children}
      </dd>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.32em] text-(--color-accent)">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ContextBlock({ wiki }: { wiki: WikiState }) {
  // "missing" is filtered out by the caller — the whole section is hidden
  // instead of rendering a "not found" placeholder.
  if (wiki.kind !== "ready") {
    return (
      <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
        {"// fetching context…"}
      </p>
    );
  }
  const { summary } = wiki;
  return (
    <div className="flex gap-4">
      {summary.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={summary.thumbnail.url}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 rounded-sm border border-(--color-border) object-cover"
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-relaxed text-(--color-foreground-muted)">
          {summary.extract}
        </p>
        <a
          href={summary.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle) transition-colors hover:text-(--color-accent)"
        >
          wikipedia ↗
        </a>
      </div>
    </div>
  );
}

function Tracklist({
  tracks,
  loading,
}: {
  tracks: NormalizedTrack[] | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
        {"// loading…"}
      </p>
    );
  }
  if (!tracks || tracks.length === 0) {
    return (
      <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
        {"// no tracklist available"}
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {tracks.map((track, index) => {
        const isHeading = track.type === "heading";
        if (isHeading) {
          return (
            <li
              key={`${index}-${track.title}`}
              className="mt-2 mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
            >
              {track.title}
            </li>
          );
        }
        return (
          <li
            key={`${index}-${track.title}`}
            className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 border-b border-(--color-border)/60 py-1.5 font-mono text-[11px] last:border-b-0"
          >
            <span className="text-(--color-foreground-subtle)">
              {track.position || "—"}
            </span>
            <span className="truncate text-(--color-foreground)">
              {track.title}
            </span>
            <span className="tabular-nums text-(--color-foreground-subtle)">
              {track.duration || "—"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle) transition-colors hover:text-(--color-accent)"
      title={`Open on ${label}`}
    >
      <span>{label}</span>
      <svg
        width="10"
        height="10"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 2 H2 V10 H10 V7" />
        <path d="M7 2 H10 V5" />
        <path d="M10 2 L5.5 6.5" />
      </svg>
    </a>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-(--color-foreground-subtle) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 3 L11 11 M11 3 L3 11" />
      </svg>
    </button>
  );
}
