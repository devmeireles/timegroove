"use client";

import { ChevronDown, LogOut, Music } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface AvatarMenuProps {
  onRequestAbout?: () => void;
  onRequestPlaylists?: () => void;
}

interface UserProfile {
  spotifyUserId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export function AvatarMenu({
  onRequestAbout,
  onRequestPlaylists,
}: AvatarMenuProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/auth/profile", {
          cache: "no-store",
        });
        if (response.ok) {
          setProfile(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchProfile();
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

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/spotify/disconnect", { method: "POST" });
      setProfile(null);
      setOpen(false);
      // Refresh page to update UI
      window.location.reload();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 px-2 text-(--color-foreground-muted) transition-colors hover:text-(--color-foreground)"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open menu"
      >
        {isLoading ? (
          <Music size={18} aria-hidden="true" />
        ) : profile?.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.displayName || "User"}
            width={20}
            height={20}
            unoptimized
            className="w-5 h-5 rounded-full"
          />
        ) : (
          <Music size={18} aria-hidden="true" />
        )}
        <ChevronDown size={12} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-30 mt-2 min-w-48 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-1 shadow-2xl"
        >
          {profile?.spotifyUserId ? (
            <>
              <div className="px-2 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle) mb-1">
                  Connected
                </p>
                <p className="text-sm font-light text-(--color-foreground)">
                  {profile.displayName || "Spotify User"}
                </p>
              </div>
              <div className="my-1 h-px bg-(--color-border)" />
            </>
          ) : (
            <>
              <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle)">
                Time Groove
              </p>
              <div className="my-1 h-px bg-(--color-border)" />
            </>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRequestPlaylists?.();
            }}
            className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
          >
            Playlists
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRequestAbout?.();
            }}
            className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
          >
            About
          </button>

          {profile?.spotifyUserId && (
            <>
              <div className="my-1 h-px bg-(--color-border)" />
              <button
                type="button"
                role="menuitem"
                onClick={handleDisconnect}
                className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-red-400"
              >
                <LogOut size={12} />
                Disconnect
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
