import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const reconciliationMappings = sqliteTable(
  "reconciliation_mappings",
  {
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
  },
  (table) => ({
    uniqueDiscogs: uniqueIndex("reconciliation_mappings_discogs_unique").on(
      table.discogsId,
      table.discogsType,
    ),
    statusIdx: index("idx_mapping_status").on(table.status),
    matchedAtIdx: index("idx_mapping_matched_at").on(table.matchedAt),
  }),
);

export const discogsVideoResolutions = sqliteTable(
  "discogs_video_resolutions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    discogsId: integer("discogs_id").notNull(),
    discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
    youtubeVideoId: text("youtube_video_id"),
    resolvedAt: text("resolved_at").notNull(),
    rawPayload: text("raw_payload"),
  },
  (table) => ({
    uniqueDiscogs: uniqueIndex("discogs_video_resolutions_discogs_unique").on(
      table.discogsId,
      table.discogsType,
    ),
    resolvedAtIdx: index("idx_video_resolved_at").on(table.resolvedAt),
  }),
);

export const discogsArtistDetails = sqliteTable(
  "discogs_artist_details",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    artistId: integer("artist_id").notNull(),
    rawPayload: text("raw_payload").notNull(),
    fetchedAt: text("fetched_at").notNull(),
  },
  (table) => ({
    artistUnique: uniqueIndex("discogs_artist_details_artist_unique").on(
      table.artistId,
    ),
    fetchedAtIdx: index("idx_artist_fetched_at").on(table.fetchedAt),
  }),
);

export const appUsers = sqliteTable(
  "app_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    auth0Sub: text("auth0_sub"),
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    spotifyUserId: text("spotify_user_id"),
    spotifyAccessToken: text("spotify_access_token"),
    spotifyRefreshToken: text("spotify_refresh_token"),
    spotifyTokenExpiresAt: text("spotify_token_expires_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => ({
    auth0Unique: uniqueIndex("app_users_auth0_sub_unique").on(table.auth0Sub),
    emailIdx: index("idx_app_users_email").on(table.email),
    lastSeenIdx: index("idx_app_users_last_seen").on(table.lastSeenAt),
    spotifyUserIdx: index("idx_app_users_spotify").on(table.spotifyUserId),
  }),
);

export const appUserFavorites = sqliteTable(
  "app_user_favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    discogsId: integer("discogs_id").notNull(),
    discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
    releaseTitle: text("release_title"),
    releaseYear: integer("release_year"),
    releaseCountry: text("release_country"),
    coverUrl: text("cover_url"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniqueUserDiscogs: uniqueIndex("app_user_favorites_user_discogs_unique").on(
      table.userId,
      table.discogsId,
      table.discogsType,
    ),
    userIdx: index("idx_favorites_user").on(table.userId),
    createdAtIdx: index("idx_favorites_created").on(table.createdAt),
  }),
);

export const appPlaylists = sqliteTable(
  "app_playlists",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    spotifyPlaylistId: text("spotify_playlist_id"),
    spotifySyncStatus: text("spotify_sync_status", {
      enum: ["not-synced", "synced", "partially-synced", "sync-error"],
    }).default("not-synced"),
    spotifySyncedAt: text("spotify_synced_at"),
    spotifySyncError: text("spotify_sync_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    uniqueUserName: uniqueIndex("app_playlists_user_name_unique").on(
      table.userId,
      table.name,
    ),
    userIdx: index("idx_playlists_user").on(table.userId),
    updatedAtIdx: index("idx_playlists_updated").on(table.updatedAt),
    spotifySyncIdx: index("idx_playlists_spotify_sync").on(
      table.spotifySyncStatus,
    ),
  }),
);

export const appPlaylistItems = sqliteTable(
  "app_playlist_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    playlistId: integer("playlist_id")
      .notNull()
      .references(() => appPlaylists.id, { onDelete: "cascade" }),
    discogsId: integer("discogs_id").notNull(),
    discogsType: text("discogs_type", { enum: ["release", "master"] }).notNull(),
    releaseTitle: text("release_title"),
    releaseYear: integer("release_year"),
    releaseCountry: text("release_country"),
    coverUrl: text("cover_url"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    uniquePlaylistDiscogs: uniqueIndex(
      "app_playlist_items_playlist_discogs_unique",
    ).on(table.playlistId, table.discogsId, table.discogsType),
    playlistIdx: index("idx_playlist_items_playlist").on(table.playlistId),
    discogsIdx: index("idx_playlist_items_discogs").on(
      table.discogsId,
      table.discogsType,
    ),
  }),
);

export const dbSchema = {
  reconciliationMappings,
  discogsVideoResolutions,
  discogsArtistDetails,
  appUsers,
  appUserFavorites,
  appPlaylists,
  appPlaylistItems,
};
