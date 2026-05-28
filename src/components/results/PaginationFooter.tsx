"use client";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface PaginationFooterProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function PaginationFooter({
  hasMore,
  isLoadingMore,
  sentinelRef,
}: PaginationFooterProps) {
  if (!hasMore) {
    return (
      <p className="px-2 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
        end of crate
      </p>
    );
  }
  return (
    <div
      ref={sentinelRef}
      className="flex items-center justify-center gap-2 px-2 py-4"
    >
      {isLoadingMore ? (
        <>
          <LoadingSpinner size={12} className="text-(--color-accent)" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            loading more
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          scroll for more
        </span>
      )}
    </div>
  );
}
