"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  useYoutubePlayer,
  type UseYoutubePlayer,
} from "@/hooks/useYoutubePlayer";

const YoutubePlayerContext = createContext<UseYoutubePlayer | null>(null);

/**
 * Wraps the app so the YouTube player can be shared between the queue
 * panel (cards trigger playback) and the now-playing pane (renders the
 * loaded release + controls). The hidden iframe host is rendered here too
 * so it stays mounted across UI changes.
 */
export function YoutubePlayerProvider({ children }: { children: ReactNode }) {
  const player = useYoutubePlayer();
  const { containerRef } = player;
  return (
    <YoutubePlayerContext.Provider value={player}>
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
    </YoutubePlayerContext.Provider>
  );
}

export function useYoutubePlayerContext(): UseYoutubePlayer {
  const ctx = useContext(YoutubePlayerContext);
  if (!ctx) {
    throw new Error(
      "useYoutubePlayerContext must be used inside <YoutubePlayerProvider>",
    );
  }
  return ctx;
}
