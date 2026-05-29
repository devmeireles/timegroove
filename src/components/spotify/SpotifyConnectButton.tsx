"use client";

import { Music2 } from "lucide-react";
import { useCallback, useState } from "react";

interface SpotifyConnectButtonProps {
  isConnected?: boolean;
}

export function SpotifyConnectButton({
  isConnected = false,
}: SpotifyConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/spotify/authorize", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to initiate Spotify connection");
      }

      const data = (await response.json()) as { authUrl: string };

      // Redirect to Spotify auth
      window.location.href = data.authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setIsLoading(false);
    }
  }, []);

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 rounded-sm bg-green-500/10 px-3 py-2 text-sm">
        <Music2 size={14} className="text-green-600" />
        <span className="text-green-700 font-mono text-[11px] uppercase">
          Spotify Connected
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="flex items-center gap-2 rounded-sm bg-(--color-accent) px-3 py-2 text-sm font-mono uppercase tracking-[0.12em] text-(--color-background) transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Music2 size={14} />
        {isLoading ? "Connecting..." : "Connect Spotify"}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
