"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Optional label for accessibility (used as aria-label on the dialog). */
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Modal dialog built on the native <dialog> element. Native handles Esc to
 * close, focus management, and the backdrop. We layer on:
 *   - calling showModal/close from React state
 *   - dismissing on backdrop click (clicks that hit the dialog element
 *     itself, not its inner content)
 */
export function Dialog({ open, onClose, ariaLabel, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={ariaLabel}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(720px,92vw)] max-h-[85vh] overflow-hidden rounded-md border border-(--color-border) bg-(--color-surface) p-0 text-(--color-foreground) shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open ? children : null}
    </dialog>
  );
}
