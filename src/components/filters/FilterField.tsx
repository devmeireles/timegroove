import type { ReactNode } from "react";

interface FilterFieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}

export function FilterField({ label, htmlFor, hint, children }: FilterFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="font-mono text-[10px] text-(--color-foreground-subtle)">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
