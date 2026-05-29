/**
 * Server-only env access. Importing this module from a client component will
 * surface a clear runtime error — but the values themselves are never read
 * outside server code (route handlers, server components, server services).
 */
import "server-only";

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local.`,
    );
  }
  return value;
}

function readOptional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

export const serverEnv = {
  discogs: {
    baseUrl: readOptional("DISCOGS_API_BASE_URL", "https://api.discogs.com"),
    get token() {
      return readRequired("DISCOGS_TOKEN");
    },
    userAgent: readOptional(
      "DISCOGS_USER_AGENT",
      "TimeGrooveExplorer/0.1 (+https://example.local)",
    ),
  },
  spotify: {
    baseUrl: readOptional("SPOTIFY_API_BASE_URL", "https://api.spotify.com"),
    authUrl: readOptional(
      "SPOTIFY_AUTH_URL",
      "https://accounts.spotify.com/api/token",
    ),
    oauthAuthUrl: readOptional(
      "SPOTIFY_OAUTH_AUTH_URL",
      "https://accounts.spotify.com/authorize",
    ),
    get clientId() {
      return readRequired("SPOTIFY_CLIENT_ID");
    },
    get clientSecret() {
      return readRequired("SPOTIFY_CLIENT_SECRET");
    },
    get redirectUri() {
      return readRequired("SPOTIFY_REDIRECT_URI");
    },
  },
  get encryptionKey() {
    return readRequired("ENCRYPTION_KEY");
  },
  turso: {
    get url() {
      return readRequired("TURSO_DATABASE_URL");
    },
    /**
     * Empty token is allowed when `TURSO_DATABASE_URL` is a `file:` URL
     * (embedded mode) — only hosted libsql:// URLs require it.
     */
    get authToken() {
      return readOptional("TURSO_AUTH_TOKEN", "");
    },
  },
} as const;
