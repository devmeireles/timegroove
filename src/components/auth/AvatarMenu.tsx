"use client";

import { ChevronDown, CircleUserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface AuthUser {
  email?: string;
  name?: string;
}

interface AvatarMenuProps {
  onRequestFavorites: () => void;
  onRequestPlaylists: () => void;
}

export function AvatarMenu({
  onRequestFavorites,
  onRequestPlaylists,
}: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch("/auth/profile", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setUser(null);
          return;
        }
        const profile = (await response.json()) as AuthUser;
        setUser(profile);
      } catch {
        setUser(null);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, []);

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

  const label = useMemo(() => {
    if (!user) return "Guest";
    return user.email ?? user.name ?? "User";
  }, [user]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 px-1 text-(--color-foreground-muted) transition-colors hover:text-(--color-foreground)"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
      >
        <CircleUserRound size={19} aria-hidden="true" />
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 min-w-48 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-1 shadow-2xl"
        >
          <p className="truncate px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle)">
            {label}
          </p>
          <div className="my-1 h-px bg-(--color-border)" />

          {!user ? (
            <>
              <a
                role="menuitem"
                href="/auth/login"
                className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
              >
                Login
              </a>
              <a
                role="menuitem"
                href="/auth/login?screen_hint=signup"
                className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
              >
                Signup
              </a>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onRequestFavorites();
                }}
                className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
              >
                Favorites
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onRequestPlaylists();
                }}
                className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
              >
                Playlists
              </button>
              <a
                role="menuitem"
                href="/auth/logout"
                className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
              >
                Logout
              </a>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
