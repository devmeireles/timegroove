import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export const reconciliationMappings = sqliteTable("reconciliation_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discogsId: integer("discogs_id").notNull(),
  discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
  spotifyArtistId: text("spotify_artist_id"),
  spotifyAlbumId: text("spotify_album_id"),
  spotifyTrackIds: text("spotify_track_ids"),
  confidenceScore: real("confidence_score").notNull().default(0),
  status: text("status", {
    enum: ["matched", "no-match", "manual-override"],
  }).notNull(),
  matchedAt: text("matched_at").notNull(),
  rawSpotifyPayload: text("raw_spotify_payload"),
});

export const discogsVideoResolutions = sqliteTable("discogs_video_resolutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  discogsId: integer("discogs_id").notNull(),
  discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
  youtubeVideoId: text("youtube_video_id"),
  resolvedAt: text("resolved_at").notNull(),
  rawPayload: text("raw_payload"),
});

export const discogsArtistDetails = sqliteTable("discogs_artist_details", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artistId: integer("artist_id").notNull(),
  rawPayload: text("raw_payload").notNull(),
  fetchedAt: text("fetched_at").notNull(),
});

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  auth0Sub: text("auth0_sub").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
});

export const appUserFavorites = sqliteTable("app_user_favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  discogsId: integer("discogs_id").notNull(),
  discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
  releaseTitle: text("release_title"),
  releaseYear: integer("release_year"),
  releaseCountry: text("release_country"),
  coverUrl: text("cover_url"),
  createdAt: text("created_at").notNull(),
});

export const appPlaylists = sqliteTable("app_playlists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const appPlaylistItems = sqliteTable("app_playlist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  playlistId: integer("playlist_id").notNull(),
  discogsId: integer("discogs_id").notNull(),
  discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
  releaseTitle: text("release_title"),
  releaseYear: integer("release_year"),
  releaseCountry: text("release_country"),
  coverUrl: text("cover_url"),
  createdAt: text("created_at").notNull(),
});

export const dbSchema = {
  reconciliationMappings,
  discogsVideoResolutions,
  discogsArtistDetails,
  appUsers,
  appUserFavorites,
  appPlaylists,
  appPlaylistItems,
};
