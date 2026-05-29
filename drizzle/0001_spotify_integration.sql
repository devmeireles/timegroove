CREATE TABLE `app_users_spotify_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auth0_sub` text,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`spotify_user_id` text,
	`spotify_access_token` text,
	`spotify_refresh_token` text,
	`spotify_token_expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint

INSERT INTO `app_users_spotify_new` SELECT 
	`id`, `auth0_sub`, `email`, `display_name`, `avatar_url`, 
	NULL, NULL, NULL, NULL,
	`created_at`, `updated_at`, `last_seen_at`
FROM `app_users`;
--> statement-breakpoint

DROP TABLE `app_users`;
--> statement-breakpoint
ALTER TABLE `app_users_spotify_new` RENAME TO `app_users`;
--> statement-breakpoint

CREATE UNIQUE INDEX `app_users_auth0_sub_unique` on `app_users` (`auth0_sub`);
--> statement-breakpoint
CREATE INDEX `idx_app_users_email` on `app_users` (`email`);
--> statement-breakpoint
CREATE INDEX `idx_app_users_last_seen` on `app_users` (`last_seen_at`);
--> statement-breakpoint
CREATE INDEX `idx_app_users_spotify` on `app_users` (`spotify_user_id`);
--> statement-breakpoint

CREATE TABLE `app_playlists_spotify_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`spotify_playlist_id` text,
	`spotify_sync_status` text DEFAULT 'not-synced',
	`spotify_synced_at` text,
	`spotify_sync_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON DELETE cascade
);
--> statement-breakpoint

INSERT INTO `app_playlists_spotify_new` SELECT 
	`id`, `user_id`, `name`, NULL, 'not-synced', NULL, NULL,
	`created_at`, `updated_at`
FROM `app_playlists`;
--> statement-breakpoint

DROP TABLE `app_playlists`;
--> statement-breakpoint
ALTER TABLE `app_playlists_spotify_new` RENAME TO `app_playlists`;
--> statement-breakpoint

CREATE UNIQUE INDEX `app_playlists_user_name_unique` on `app_playlists` (`user_id`,`name`);
--> statement-breakpoint
CREATE INDEX `idx_playlists_user` on `app_playlists` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_playlists_updated` on `app_playlists` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_playlists_spotify_sync` on `app_playlists` (`spotify_sync_status`);
