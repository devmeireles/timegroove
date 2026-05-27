"use client";

import type { InputHTMLAttributes } from "react";

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = "", ...rest }: TextInputProps) {
  return (
    <input
      type="text"
      autoComplete="off"
      spellCheck={false}
      {...rest}
      className={
        "w-full rounded-sm border border-(--color-border) bg-(--color-surface) " +
        "px-2.5 py-1.5 font-mono text-sm text-(--color-foreground) " +
        "transition-colors duration-150 " +
        "hover:border-(--color-border-strong) " +
        "focus:border-(--color-accent-muted) focus:outline-none " +
        "focus:ring-1 focus:ring-(--color-accent-muted) " +
        className
      }
    />
  );
}
