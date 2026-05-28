"use client";

import type { ReactNode } from "react";

import { Dialog } from "@/components/details/Dialog";

interface AccountDialogShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  ariaLabel: string;
  loading: boolean;
  error: string | null;
  loadingMessage: string;
  emptyMessage: string;
  isEmpty: boolean;
  children: ReactNode;
}

export function AccountDialogShell({
  open,
  onClose,
  title,
  ariaLabel,
  loading,
  error,
  loadingMessage,
  emptyMessage,
  isEmpty,
  children,
}: AccountDialogShellProps) {
  return (
    <Dialog open={open} onClose={onClose} ariaLabel={ariaLabel}>
      <div className="flex max-h-[80vh] flex-col">
        <header className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--color-accent)">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle) hover:text-(--color-foreground)"
          >
            Close
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
              {loadingMessage}
            </p>
          ) : error ? (
            <p className="font-mono text-[11px] text-red-400">{error}</p>
          ) : isEmpty ? (
            <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
              {emptyMessage}
            </p>
          ) : (
            children
          )}
        </div>
      </div>
    </Dialog>
  );
}
