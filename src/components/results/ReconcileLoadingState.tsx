"use client";

interface ReconcileLoadingStateProps {
  resolved: number;
  total: number;
}

/**
 * Loading screen shown inside the queue panel while Spotify reconciliations
 * are still in flight. Two concentric pulse rings + a center dot give a
 * "scanning" feel; a thin progress bar tracks how many of the rows have
 * settled. Visual language stays inside the existing design tokens.
 */
export function ReconcileLoadingState({
  resolved,
  total,
}: ReconcileLoadingStateProps) {
  const pct = total === 0 ? 0 : Math.round((resolved / total) * 100);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-7 px-6">
      <div className="relative flex h-20 w-20 items-center justify-center">
        {/* Crosshair guides — static, futurist HUD feel */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-(--color-accent-muted)/30" />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-(--color-accent-muted)/30" />

        {/* Two outward pulses, phase-offset */}
        <div
          className="absolute inset-0 rounded-full border border-(--color-accent)/40"
          style={{
            animation: "tgScan 2.2s cubic-bezier(0,0,0.2,1) infinite",
          }}
        />
        <div
          className="absolute inset-0 rounded-full border border-(--color-accent)/30"
          style={{
            animation: "tgScan 2.2s cubic-bezier(0,0,0.2,1) 1.1s infinite",
          }}
        />

        {/* Center dot with soft halo */}
        <div className="relative h-3 w-3">
          <div className="absolute inset-[-6px] rounded-full bg-(--color-accent)/15 blur-sm" />
          <div className="relative h-3 w-3 rounded-full bg-(--color-accent)" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-(--color-foreground-subtle)">
          Tuning&nbsp;in
        </p>
        <p className="font-mono text-[12px] tabular-nums text-(--color-foreground)">
          <span className="text-(--color-accent)">{resolved}</span>
          <span className="px-2 text-(--color-border-strong)">/</span>
          <span>{total}</span>
        </p>
      </div>

      <div className="relative h-px w-48 overflow-hidden bg-(--color-border)">
        <div
          className="absolute inset-y-0 left-0 bg-(--color-accent) transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
