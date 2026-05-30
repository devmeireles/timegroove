"use client";

import type { ReactNode } from "react";

import {
  Dialog as RootDialog,
  DialogContent,
} from "@/components/ui/dialog";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, ariaLabel, children }: DialogProps) {
  return (
    <RootDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        aria-label={ariaLabel}
        showCloseButton={false}
        className="w-[min(920px,95vw)] max-w-none sm:max-w-none max-h-[90vh] overflow-hidden rounded-md border border-(--color-border) bg-(--color-surface) p-0 text-(--color-foreground) shadow-2xl"
      >
        {open ? children : null}
      </DialogContent>
    </RootDialog>
  );
}
