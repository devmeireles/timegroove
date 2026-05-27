"use client";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedSelectProps<T extends string> {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  name?: string;
}

export function SegmentedSelect<T extends string>({
  value,
  options,
  onChange,
  name,
}: SegmentedSelectProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="grid grid-cols-2 gap-1 rounded-sm border border-(--color-border) bg-(--color-surface) p-1"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={
              "rounded-xs px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-150 " +
              (selected
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-foreground-muted) hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
