"use client";

import type { ReactNode } from "react";

import { AppQueryProvider } from "@/contexts/AppQueryProvider";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { YoutubePlayerProvider } from "@/contexts/YoutubePlayerContext";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AppQueryProvider>
      <YoutubePlayerProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </YoutubePlayerProvider>
    </AppQueryProvider>
  );
}
