"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { DISCOGS_GENRES, type DiscogsGenre } from "@/lib/discogs/genres";

interface GenreComboboxProps {
  value: DiscogsGenre | null;
  onChange: (next: DiscogsGenre | null) => void;
  placeholder?: string;
  /** Where the dropdown opens. Default "bottom"; use "top" when the
   * combobox lives near the bottom of the viewport (e.g. in a footer). */
  placement?: "top" | "bottom";
}

function filterGenres(query: string): readonly DiscogsGenre[] {
  const q = query.trim().toLowerCase();
  if (q === "") return DISCOGS_GENRES;
  return DISCOGS_GENRES.filter((g) => g.toLowerCase().includes(q));
}

export function GenreCombobox({
  value,
  onChange,
  placeholder = "Any genre",
  placement = "bottom",
}: GenreComboboxProps) {
  const inputId = useId();
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => filterGenres(query), [query]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the active row in view.
  useEffect(() => {
    if (!open) return;
    const node = listboxRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // When opening, reset the search and prefill with the current value.
  const handleOpen = useCallback(() => {
    setQuery("");
    setActiveIndex(value ? DISCOGS_GENRES.indexOf(value) : 0);
    setOpen(true);
  }, [value]);

  const handleSelect = useCallback(
    (genre: DiscogsGenre) => {
      onChange(genre);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className={
          "flex w-full items-center gap-2 rounded-sm border bg-(--color-surface) px-2.5 py-1.5 transition-colors duration-150 " +
          (open
            ? "border-(--color-accent-muted) ring-1 ring-(--color-accent-muted)"
            : "border-(--color-border) hover:border-(--color-border-strong)")
        }
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && matches[activeIndex]
              ? `${listboxId}-${activeIndex}`
              : undefined
          }
          placeholder={value ?? placeholder}
          value={open ? query : (value ?? "")}
          onFocus={handleOpen}
          onClick={handleOpen}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            if (!open) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) {
                handleOpen();
                return;
              }
              setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const picked = matches[activeIndex];
              if (picked) handleSelect(picked);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setQuery("");
            } else if (event.key === "Backspace" && !query && value) {
              handleClear();
            }
          }}
          className="flex-1 bg-transparent font-mono text-sm text-(--color-foreground) outline-none placeholder:text-(--color-foreground-subtle)"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear genre"
            onClick={(event) => {
              event.stopPropagation();
              handleClear();
              inputRef.current?.focus();
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-(--color-foreground-subtle) hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M2 2 L8 8 M8 2 L2 8" />
            </svg>
          </button>
        ) : (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            ▾
          </span>
        )}
      </div>

      {open ? (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className={
            "absolute z-20 max-h-64 w-full overflow-y-auto rounded-sm border border-(--color-border) bg-(--color-surface-elevated) py-1 shadow-2xl " +
            (placement === "top" ? "bottom-full mb-1" : "top-full mt-1")
          }
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 font-mono text-[11px] text-(--color-foreground-subtle)">
              No matching genre
            </li>
          ) : (
            matches.map((genre, index) => {
              const active = index === activeIndex;
              const selected = genre === value;
              return (
                <li
                  key={genre}
                  id={`${listboxId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    handleSelect(genre);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={
                    "cursor-pointer px-3 py-1.5 font-mono text-[12.5px] transition-colors " +
                    (active
                      ? "bg-(--color-surface) text-(--color-accent)"
                      : "text-(--color-foreground-muted)") +
                    (selected ? " border-l-2 border-(--color-accent)" : "")
                  }
                >
                  {genre}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
