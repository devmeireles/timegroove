# Time Groove

Time Groove is a crate-digging companion for people who like discovering music by place and year.

Pick a country, pick a year, and Time Groove builds a queue of Discogs releases, reconciles them with Spotify metadata, finds playable YouTube videos, and lets you listen without losing your flow.

It is designed to feel curious and human on the surface, while staying pragmatic under the hood: bounded retries for rate limits, lightweight caching in SQLite/libSQL, and user-level persistence for favorites and playlists.

## What Problem This Solves

Exploring music history across countries is usually fragmented:

- Discogs has rich catalog data but not a smooth listening loop.
- Spotify is great for playback metadata but not ideal for historical release filtering.
- YouTube often has playable versions, but finding them manually breaks momentum.

Time Groove connects these pieces into one flow:

1. Search for releases by country/year/genre.
2. Enrich those releases with Spotify context.
3. Resolve playable YouTube videos from Discogs references.
4. Keep listening through the queue with auto-advance.
5. Save favorites and organize tracks into playlists.

## Product Highlights

- Country + year based exploration with infinite scrolling queue.
- Reconciliation pipeline (Discogs -> Spotify -> YouTube).
- Now Playing strip with detail modal, favorites, and playlist actions.
- Auth0 login with app user sync to database.
- Persistent favorites and playlists per user.
- Queue-aware player behavior (including auto-play next on track end).

## Technical Approach

### Frontend

- Next.js App Router (React + TypeScript).
- Tailwind CSS styling with app-level design tokens.
- Client components for queue, dialogs, player controls, and menu interactions.

### Backend and Data

- Next.js route handlers for API endpoints.
- libSQL/Turso for persistent storage.
- Repository layer for favorites, playlists, reconciliation mappings, artist details, and video resolutions.

### Authentication

- Spotify OAuth for user login and playlist sync.
- Session-aware server rendering and user synchronization into `app_users`.

### Reliability Choices

- Bounded retry/backoff for Discogs and Spotify `429` responses.
- Request dedupe for reconciliation work to reduce external API pressure.
- Cached detail and video resolution records to avoid repeated expensive calls.

## Architecture at a Glance

- `src/app/`:
App routes and API handlers.
- `src/components/`:
UI modules (filters, queue cards, dialogs, now-playing, auth menu).
- `src/services/`:
External integrations and reconciliation logic.
- `src/repositories/`:
Database persistence concerns.
- `src/db/sqlite.ts`:
Database client.
- `drizzle/` + `src/db/schema.ts`:
Versioned Drizzle migrations and schema definitions.
- `src/contexts/YoutubePlayerContext.tsx` + `src/hooks/useYoutubePlayer.ts`:
Shared hidden YouTube player state and controls.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` from your `.env` template and set values for:

- `DISCOGS_TOKEN`
- `DISCOGS_USER_AGENT`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `ENCRYPTION_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

If you use ngrok for local Spotify callback testing, update `SPOTIFY_REDIRECT_URI` with:

```bash
npm run env:spotify -- https://your-ngrok-subdomain.ngrok-free.app
```

This also rewrites `allowedDevOrigins` in `next.config.ts` to the ngrok host so local dev requests keep working.

Then copy that exact callback URL into your Spotify app dashboard.

### 3. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Validate production build

```bash
npm run build
```

### Database migrations

Schema changes are managed with Drizzle:

```bash
npm run db:generate -- --name your_migration_name
npm run db:migrate
```

`dev`, `build`, and `start` run `db:migrate` first so deployed/runtime schema stays in sync with code.

## API Surfaces (Core)

- `/api/discogs/search`: release discovery by filters.
- `/api/reconcile`: enrichment and matching pipeline.
- `/api/discogs/detail`: release/master detail for modal.
- `/api/discogs/video`: YouTube video resolution.
- `/api/favorites`: list/add/remove favorites.
- `/api/playlists`: list/create/include/exclude playlist items.

## Why the Experience Feels Fast

- Results are paginated and appended without reshuffling earlier batches.
- Reconciliation loading is staged to avoid full-screen lockups after first page.
- Queue scrolling supports observer + fallback triggers.
- Player state is global, so playback survives UI surface changes.

## Deployment

- Target: Vercel.
- Package manager: npm.
- Ensure production environment variables are configured in Vercel project settings.

## Near-Term Direction

- Playlist browsing modal with item-level playback actions.
- Deeper playback controls (previous/next buttons, queue controls).
- Additional user library workflows (export/share).

---

Time Groove is built as both a listening tool and a map: part utility, part time machine for music discovery.
