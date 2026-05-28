CREATE TABLE `app_playlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`playlist_id` integer NOT NULL,
	`discogs_id` integer NOT NULL,
	`discogs_type` text NOT NULL,
	`release_title` text,
	`release_year` integer,
	`release_country` text,
	`cover_url` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `app_playlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_playlist_items_playlist_discogs_unique` ON `app_playlist_items` (`playlist_id`,`discogs_id`,`discogs_type`);--> statement-breakpoint
CREATE INDEX `idx_playlist_items_playlist` ON `app_playlist_items` (`playlist_id`);--> statement-breakpoint
CREATE INDEX `idx_playlist_items_discogs` ON `app_playlist_items` (`discogs_id`,`discogs_type`);--> statement-breakpoint
CREATE TABLE `app_playlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_playlists_user_name_unique` ON `app_playlists` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_playlists_user` ON `app_playlists` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_playlists_updated` ON `app_playlists` (`updated_at`);--> statement-breakpoint
CREATE TABLE `app_user_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`discogs_id` integer NOT NULL,
	`discogs_type` text NOT NULL,
	`release_title` text,
	`release_year` integer,
	`release_country` text,
	`cover_url` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_user_favorites_user_discogs_unique` ON `app_user_favorites` (`user_id`,`discogs_id`,`discogs_type`);--> statement-breakpoint
CREATE INDEX `idx_favorites_user` ON `app_user_favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_favorites_created` ON `app_user_favorites` (`created_at`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auth0_sub` text NOT NULL,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_auth0_sub_unique` ON `app_users` (`auth0_sub`);--> statement-breakpoint
CREATE INDEX `idx_app_users_email` ON `app_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_app_users_last_seen` ON `app_users` (`last_seen_at`);--> statement-breakpoint
CREATE TABLE `discogs_artist_details` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artist_id` integer NOT NULL,
	`raw_payload` text NOT NULL,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discogs_artist_details_artist_unique` ON `discogs_artist_details` (`artist_id`);--> statement-breakpoint
CREATE INDEX `idx_artist_fetched_at` ON `discogs_artist_details` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `discogs_video_resolutions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discogs_id` integer NOT NULL,
	`discogs_type` text NOT NULL,
	`youtube_video_id` text,
	`resolved_at` text NOT NULL,
	`raw_payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discogs_video_resolutions_discogs_unique` ON `discogs_video_resolutions` (`discogs_id`,`discogs_type`);--> statement-breakpoint
CREATE INDEX `idx_video_resolved_at` ON `discogs_video_resolutions` (`resolved_at`);--> statement-breakpoint
CREATE TABLE `reconciliation_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`discogs_id` integer NOT NULL,
	`discogs_type` text NOT NULL,
	`spotify_artist_id` text,
	`spotify_album_id` text,
	`spotify_track_ids` text,
	`confidence_score` real DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`matched_at` text NOT NULL,
	`raw_spotify_payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reconciliation_mappings_discogs_unique` ON `reconciliation_mappings` (`discogs_id`,`discogs_type`);--> statement-breakpoint
CREATE INDEX `idx_mapping_status` ON `reconciliation_mappings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_mapping_matched_at` ON `reconciliation_mappings` (`matched_at`);