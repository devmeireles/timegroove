"use client";

import { X } from "lucide-react";

interface CloseIconButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  title?: string;
  variant?: "bordered" | "ghost";
  className?: string;
  iconSize?: number;
}

export function CloseIconButton({
  onClick,
  ariaLabel = "Close",
  title = "Close",
  variant = "bordered",
  className,
  iconSize = 12,
}: CloseIconButtonProps) {
  const base =
    variant === "ghost"
      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-(--color-foreground-subtle) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)"
      : "flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-foreground-subtle) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base}${className ? ` ${className}` : ""}`}
      aria-label={ariaLabel}
      title={title}
    >
      <X size={iconSize} aria-hidden="true" />
    </button>
  );
}
