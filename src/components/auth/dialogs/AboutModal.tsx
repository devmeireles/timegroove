"use client";

import { ExternalLink as ExternalLinkIcon, X } from "lucide-react";
import { Dialog } from "@/components/details/Dialog";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <Dialog open={open} onClose={onClose} ariaLabel="About TimeGroove">
      <div className="overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-4">
          <h2 className="text-lg font-semibold text-(--color-foreground)">
            About TimeGroove
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-(--color-foreground-muted) transition-colors hover:text-(--color-foreground)"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6 text-(--color-foreground)">
          <div>
            <p className="text-sm leading-relaxed text-(--color-foreground-muted)">
              <strong>TimeGroove</strong> is an interactive web application that lets you explore 
              music releases by country and time period. Select a country on the map, 
              filter by year and genre, and discover releases from Discogs. Perfect 
              for music collectors, enthusiasts, and researchers interested in global 
              music history and discography.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-base">Features</h3>
            <ul className="space-y-2 text-sm text-(--color-foreground-muted)">
              <li className="flex gap-2">
                <span className="text-(--color-accent)">•</span>
                <span>Interactive world map to select countries</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--color-accent)">•</span>
                <span>Filter releases by year and musical genre</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--color-accent)">•</span>
                <span>Detailed album information from Discogs</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--color-accent)">•</span>
                <span>Spotify integration for listening and more metadata</span>
              </li>
              <li className="flex gap-2">
                <span className="text-(--color-accent)">•</span>
                <span>Save favorites and create personal playlists</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-base">Data Sources</h3>
            <p className="text-sm text-(--color-foreground-muted)">
              TimeGroove uses data from{" "}
              <a
                href="https://www.discogs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--color-accent) underline hover:text-(--color-accent-muted)"
              >
                Discogs
              </a>
              {" "}for comprehensive music release information and{" "}
              <a
                href="https://open.spotify.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--color-accent) underline hover:text-(--color-accent-muted)"
              >
                Spotify
              </a>
              {" "}for playback and enriched metadata.
            </p>
          </div>

          <div className="pt-2">
            <h3 className="mb-2 font-semibold text-base">Source Code</h3>
            <a
              href="https://github.com/devmeireles/timegroove"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-sm bg-(--color-accent) px-3 py-2 text-sm font-mono uppercase tracking-[0.12em] text-(--color-background) transition-opacity hover:opacity-90"
            >
              <span>View on GitHub</span>
              <ExternalLinkIcon size={14} />
            </a>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
