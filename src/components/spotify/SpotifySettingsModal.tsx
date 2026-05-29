"use client";

import { X, Radio, Zap, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/details/Dialog";
import { SpotifyConnectButton } from "@/components/spotify/SpotifyConnectButton";

interface SpotifySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    icon: Radio,
    title: "Real-Time Sync",
    description: "Synchronize your Time Groove discoveries directly to your Spotify playlists in seconds. Your crate-dug sessions flow seamlessly to your listening ecosystem.",
  },
  {
    icon: Zap,
    title: "Cross-Platform Access",
    description: "Access your synced playlists on every device with Spotify. Switch between your phone, computer, and speakers without missing a beat.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description: "You maintain complete control over your data. Connect or disconnect at any time. We never store unnecessary information about your listening habits.",
  },
];

export function SpotifySettingsModal({
  open,
  onClose,
}: SpotifySettingsModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyUserId, setSpotifyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/profile", {
          cache: "no-store",
        });
        if (response.ok) {
          const profile = (await response.json()) as {
            spotifyUserId?: string;
          };
          setIsConnected(!!profile.spotifyUserId);
          setSpotifyUserId(profile.spotifyUserId || null);
        }
      } catch (error) {
        console.error("Failed to fetch Spotify status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStatus();
  }, [open]);

  const handleDisconnect = async () => {
    try {
      const response = await fetch("/api/auth/spotify/disconnect", {
        method: "POST",
      });
      if (response.ok) {
        setIsConnected(false);
        setSpotifyUserId(null);
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to disconnect Spotify:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Spotify Integration">
      <div className="overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-4">
          <h2 className="text-lg font-semibold text-(--color-foreground)">
            Spotify Integration
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-(--color-foreground-muted) transition-colors hover:text-(--color-foreground)"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-6 text-(--color-foreground)">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 rounded-full border border-transparent border-t-(--color-foreground-muted) animate-spin"></div>
            </div>
          ) : isConnected ? (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-(--color-surface-elevated) rounded border border-(--color-border) p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-light text-(--color-foreground-muted)">
                      Connection Status
                    </p>
                    <p className="text-lg font-light text-(--color-foreground)">
                      Active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-(--color-border) text-xs text-(--color-foreground-muted) font-mono">
                  {spotifyUserId}
                </div>
              </div>

              {/* Disconnect Button */}
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full px-4 py-3 rounded border border-(--color-border) text-sm font-light text-(--color-foreground-muted) transition-all hover:bg-(--color-surface-elevated) hover:text-(--color-foreground) active:scale-95"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Intro */}
              <p className="text-sm font-light text-(--color-foreground-muted) leading-relaxed">
                Connect your Spotify account to unlock advanced features and seamless integration with Time Groove.
              </p>

              {/* Service Cards */}
              <div className="grid grid-cols-1 gap-4">
                {FEATURES.map((feature) => {
                  const IconComponent = feature.icon;
                  return (
                    <div
                      key={feature.title}
                      className="group bg-(--color-surface-elevated) rounded border border-(--color-border) p-5 hover:border-(--color-accent) transition-all hover:bg-(--color-surface)"
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <div className="flex items-center justify-center w-10 h-10 rounded bg-(--color-surface) group-hover:bg-(--color-accent) group-hover:bg-opacity-10 transition-colors">
                            <IconComponent size={20} className="text-(--color-foreground-muted) group-hover:text-(--color-accent) transition-colors" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-light text-(--color-foreground) mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-xs font-light text-(--color-foreground-muted) leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Connect Button */}
              <div className="pt-4 flex justify-center">
                <SpotifyConnectButton
                  isConnected={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
