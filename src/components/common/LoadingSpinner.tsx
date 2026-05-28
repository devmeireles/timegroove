"use client";

import { LoaderCircle } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 12, className }: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      size={size}
      aria-hidden="true"
      className={`animate-spin ${className ?? ""}`.trim()}
    />
  );
}
