"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NormalizedRelease } from "@/types/discogs";
import type { EnrichedSpotify } from "@/types/reconciliation";

/**
 * Hidden YouTube IFrame Player.
 *
 * Why YouTube embeds (and not Spotify): YouTube's IFrame API creates the
 * iframe with `allow="autoplay; encrypted-media; ..."` baked in, so
 * `player.playVideo()` actually produces sound when called inside a parent-
 * page user gesture. Spotify's iframe does not, which is why a hidden
 * Spotify embed silently failed.
 *
 * The hook stores the *full* loaded release (not just an id) so a
 * "now playing" UI can render artwork/title/artist without an extra lookup.
 */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(videoId: string): void;
  destroy(): void;
}

interface YTStateChangeEvent {
  data: number;
}

interface YTApi {
  Player: new (
    element: string | HTMLElement,
    options: {
      host?: string;
      height?: string | number;
      width?: string | number;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: YTStateChangeEvent) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_URL = "https://www.youtube.com/iframe_api";

let apiPromise: Promise<YTApi> | null = null;

function loadYoutubeApi(): Promise<YTApi> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot load YouTube IFrame API during SSR"));
      return;
    }
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YT global was not set after API ready"));
    };
    if (!document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onerror = () =>
        reject(new Error("Failed to load YouTube IFrame API"));
      document.body.appendChild(script);
    }
  });
  return apiPromise;
}

async function resolveVideoId(
  discogsId: number,
  discogsType: "release" | "master",
  signal: AbortSignal,
): Promise<string | null> {
  const response = await fetch("/api/discogs/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discogsId, discogsType }),
    signal,
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { videoId?: string | null };
  return data.videoId ?? null;
}

export interface PlayReleaseInput {
  release: NormalizedRelease;
  spotify: EnrichedSpotify | null;
}

export type ResolveStatus = "resolving" | "no-video" | "ready" | "error";

export interface UseYoutubePlayer {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Currently-loaded release, or null when nothing is loaded. */
  loadedRelease: NormalizedRelease | null;
  /** Spotify metadata for the loaded release — used for cover art etc. */
  loadedSpotify: EnrichedSpotify | null;
  isPlaying: boolean;
  /** Per-release resolution status — undefined means never attempted. */
  resolveStatus: Map<string, ResolveStatus>;
  playRelease: (input: PlayReleaseInput) => void;
  /** Toggle play/pause on the currently-loaded release. No-op when nothing
   * is loaded. */
  togglePlay: () => void;
  /** Pause the player and clear `loadedRelease` so the now-playing UI
   * unmounts. */
  stop: () => void;
}

function releaseKey(release: NormalizedRelease): string {
  const type = release.type === "master" ? "master" : "release";
  return `${type}-${release.id}`;
}

export function useYoutubePlayer(): UseYoutubePlayer {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const initPromiseRef = useRef<Promise<YTPlayer> | null>(null);

  const [loadedRelease, setLoadedRelease] = useState<NormalizedRelease | null>(
    null,
  );
  const [loadedSpotify, setLoadedSpotify] =
    useState<EnrichedSpotify | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<
    Map<string, ResolveStatus>
  >(new Map());

  const inFlightRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      inFlightRef.current?.abort();
      try {
        playerRef.current?.destroy();
      } catch {
        // YT.Player.destroy can throw if the iframe already unmounted; ignore.
      }
      playerRef.current = null;
    };
  }, []);

  const ensurePlayer = useCallback(
    (initialVideoId: string): Promise<YTPlayer> => {
      if (playerRef.current) return Promise.resolve(playerRef.current);
      if (initPromiseRef.current) return initPromiseRef.current;

      initPromiseRef.current = (async () => {
        const YT = await loadYoutubeApi();
        const host = containerRef.current;
        if (!host) throw new Error("YouTube player container is not mounted");

        const target = document.createElement("div");
        host.appendChild(target);

        return new Promise<YTPlayer>((resolve) => {
          new YT.Player(target, {
            host: "https://www.youtube-nocookie.com",
            height: 180,
            width: 320,
            videoId: initialVideoId,
            playerVars: {
              playsinline: 1,
              modestbranding: 1,
              rel: 0,
              autoplay: 1,
            },
            events: {
              onReady: (event) => {
                playerRef.current = event.target;
                event.target.playVideo();
                resolve(event.target);
              },
              onStateChange: (event) => {
                // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
                if (event.data === 1) setIsPlaying(true);
                else if (event.data === 2 || event.data === 0)
                  setIsPlaying(false);
              },
            },
          });
        });
      })();

      return initPromiseRef.current;
    },
    [],
  );

  const playRelease = useCallback(
    async ({ release, spotify }: PlayReleaseInput) => {
      const key = releaseKey(release);
      const currentKey = loadedRelease ? releaseKey(loadedRelease) : null;

      // Toggle if the same release is already loaded.
      if (currentKey === key && playerRef.current) {
        if (isPlaying) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
        return;
      }

      inFlightRef.current?.abort();
      const controller = new AbortController();
      inFlightRef.current = controller;
      setResolveStatus((prev) => {
        const next = new Map(prev);
        next.set(key, "resolving");
        return next;
      });

      const discogsType: "release" | "master" =
        release.type === "master" ? "master" : "release";

      let videoId: string | null;
      try {
        videoId = await resolveVideoId(
          release.id,
          discogsType,
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("YouTube resolve error:", err);
        setResolveStatus((prev) => {
          const next = new Map(prev);
          next.set(key, "error");
          return next;
        });
        return;
      }
      if (controller.signal.aborted) return;

      if (!videoId) {
        setResolveStatus((prev) => {
          const next = new Map(prev);
          next.set(key, "no-video");
          return next;
        });
        return;
      }

      setResolveStatus((prev) => {
        const next = new Map(prev);
        next.set(key, "ready");
        return next;
      });

      try {
        const firstLoad = !playerRef.current;
        const player = await ensurePlayer(videoId);
        if (controller.signal.aborted) return;
        if (firstLoad) {
          // Auto-play already triggered in onReady.
          setLoadedRelease(release);
          setLoadedSpotify(spotify);
        } else {
          player.loadVideoById(videoId);
          setLoadedRelease(release);
          setLoadedSpotify(spotify);
        }
      } catch (err) {
        console.error("YouTube player error:", err);
        setResolveStatus((prev) => {
          const next = new Map(prev);
          next.set(key, "error");
          return next;
        });
      }
    },
    [ensurePlayer, loadedRelease, isPlaying],
  );

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !loadedRelease) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [loadedRelease, isPlaying]);

  const stop = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {
        // Player may have torn down; safe to ignore.
      }
    }
    setLoadedRelease(null);
    setLoadedSpotify(null);
    setIsPlaying(false);
  }, []);

  return {
    containerRef,
    loadedRelease,
    loadedSpotify,
    isPlaying,
    resolveStatus,
    playRelease,
    togglePlay,
    stop,
  };
}
