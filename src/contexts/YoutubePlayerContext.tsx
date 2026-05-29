"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  useYoutubePlayer,
  type UseYoutubePlayer,
} from "@/hooks/useYoutubePlayer";

type YoutubePlayerController = Omit<
  UseYoutubePlayer,
  "currentTimeSec" | "durationSec"
>;

type YoutubePlayerTiming = Pick<UseYoutubePlayer, "currentTimeSec" | "durationSec">;

const YoutubePlayerControllerContext =
  createContext<YoutubePlayerController | null>(null);
const YoutubePlayerTimingContext = createContext<YoutubePlayerTiming | null>(null);

/**
 * Wraps the app so the YouTube player can be shared between the queue
 * panel (cards trigger playback) and the now-playing pane (renders the
 * loaded release + controls). The hidden iframe host is rendered here too
 * so it stays mounted across UI changes.
 */
export function YoutubePlayerProvider({ children }: { children: ReactNode }) {
  const player = useYoutubePlayer();
  const {
    containerRef,
    currentTimeSec,
    durationSec,
    loadedRelease,
    loadedSpotify,
    queueItems,
    isPlaying,
    resolveStatus,
    registerQueue,
    removeFromQueue,
    playRelease,
    togglePlay,
    playPrevious,
    playNext,
    seekToProgress,
    stop,
  } = player;
  const controllerValue = useMemo(
    () => ({
      containerRef,
      loadedRelease,
      loadedSpotify,
      queueItems,
      isPlaying,
      resolveStatus,
      registerQueue,
      removeFromQueue,
      playRelease,
      togglePlay,
      playPrevious,
      playNext,
      seekToProgress,
      stop,
    }),
    [
      containerRef,
      loadedRelease,
      loadedSpotify,
      queueItems,
      isPlaying,
      resolveStatus,
      registerQueue,
      removeFromQueue,
      playRelease,
      togglePlay,
      playPrevious,
      playNext,
      seekToProgress,
      stop,
    ],
  );
  const timingValue = useMemo(
    () => ({ currentTimeSec, durationSec }),
    [currentTimeSec, durationSec],
  );
  return (
    <YoutubePlayerControllerContext.Provider value={controllerValue}>
      <YoutubePlayerTimingContext.Provider value={timingValue}>
        {children}
        <div
          ref={containerRef}
          className="pointer-events-none fixed"
          style={{
            left: -9999,
            top: 0,
            width: 320,
            height: 180,
            opacity: 0,
          }}
          aria-hidden="true"
        />
      </YoutubePlayerTimingContext.Provider>
    </YoutubePlayerControllerContext.Provider>
  );
}

export function useYoutubePlayerControllerContext(): YoutubePlayerController {
  const ctx = useContext(YoutubePlayerControllerContext);
  if (!ctx) {
    throw new Error(
      "useYoutubePlayerControllerContext must be used inside <YoutubePlayerProvider>",
    );
  }
  return ctx;
}

export function useYoutubePlayerTimingContext(): YoutubePlayerTiming {
  const ctx = useContext(YoutubePlayerTimingContext);
  if (!ctx) {
    throw new Error(
      "useYoutubePlayerTimingContext must be used inside <YoutubePlayerProvider>",
    );
  }
  return ctx;
}
