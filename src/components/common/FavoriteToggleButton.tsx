"use client";

import { Heart } from "lucide-react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface FavoriteToggleButtonProps {
  isFavorite: boolean;
  isPending: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteToggleButton({
  isFavorite,
  isPending,
  onToggle,
  className,
}: FavoriteToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      className={
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors " +
        (isFavorite
          ? "border-pink-500/60 bg-pink-500/20 text-pink-400"
          : "border-(--color-border) text-(--color-foreground-subtle) hover:border-(--color-border-strong) hover:text-(--color-foreground)") +
        (isPending ? " opacity-60" : "") +
        (className ? ` ${className}` : "")
      }
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {isPending ? (
        <LoadingSpinner size={12} />
      ) : (
        <Heart
          size={12}
          aria-hidden="true"
          fill={isFavorite ? "currentColor" : "none"}
        />
      )}
    </button>
  );
}
