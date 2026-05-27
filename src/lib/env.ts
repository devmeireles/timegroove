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
} as const;
