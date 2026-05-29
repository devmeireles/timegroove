"use client";

import { AboutModal } from "@/components/auth/dialogs/AboutModal";
import { FavoritesDialog } from "@/components/auth/dialogs/FavoritesDialog";
import { PlaylistsDialog } from "@/components/auth/dialogs/PlaylistsDialog";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { MainPane } from "@/components/layout/MainPane";
import { NowPlayingPane } from "@/components/results/NowPlayingPane";
import type { HomeShowcaseState } from "@/features/home/useHomeShowcaseState";

interface HomeShowcaseProps {
  state: HomeShowcaseState;
}

export function HomeShowcase({ state }: HomeShowcaseProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="shrink-0 border-b border-(--color-border) bg-(--color-surface)">
        <FilterPanel
          values={state.filters}
          onChange={state.setFilters}
          onSubmit={state.handleSubmit}
          onReset={state.handleReset}
          onRequestAbout={state.openAbout}
          onRequestPlaylists={state.openPlaylists}
          isLoading={state.isLoading}
        />
      </div>
      <main className="min-h-0 flex-1 overflow-hidden">
        <MainPane
          data={state.data}
          error={state.error}
          lastQuery={state.lastQuery}
          selectedCountry={state.filters.country ?? null}
          onSelectCountry={state.handleSelectCountry}
          pagesLoaded={state.pagesLoaded}
          hasMore={state.hasMore}
          isLoadingMore={state.isLoadingMore}
          onLoadMore={state.loadMore}
        />
      </main>
      <NowPlayingPane />
      <AboutModal open={state.aboutOpen} onClose={state.closeAbout} />
      <FavoritesDialog open={state.favoritesOpen} onClose={state.closeFavorites} />
      <PlaylistsDialog open={state.playlistsOpen} onClose={state.closePlaylists} />
    </div>
  );
}
