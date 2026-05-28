"use client";

import { Pause, Play } from "lucide-react";

interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export function PlayPauseButton({ isPlaying, onToggle }: PlayPauseButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
        (isPlaying
          ? "bg-(--color-accent) text-(--color-background) ring-2 ring-accent/40"
          : "border border-(--color-accent) text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-background)")
      }
      aria-label={isPlaying ? "Pause" : "Play"}
      aria-pressed={isPlaying}
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause size={14} fill="currentColor" aria-hidden="true" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
    </button>
  );
}
