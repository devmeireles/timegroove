const DEFAULT_RETRY_AFTER_SECONDS = 1;

export function parseRetryAfterSeconds(value: string | null): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS;

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.max(DEFAULT_RETRY_AFTER_SECONDS, asNumber);
  }

  const retryAt = Date.parse(value);
  if (Number.isFinite(retryAt)) {
    const seconds = Math.ceil((retryAt - Date.now()) / 1000);
    return Math.max(DEFAULT_RETRY_AFTER_SECONDS, seconds);
  }

  return DEFAULT_RETRY_AFTER_SECONDS;
}

export async function delayMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
