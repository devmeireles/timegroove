#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <ngrok-base-url>" >&2
  echo "Example: $0 https://abcd-1234.ngrok-free.app" >&2
  exit 1
fi

ngrok_url="${1%/}"
if [[ "$ngrok_url" != http://* && "$ngrok_url" != https://* ]]; then
  ngrok_url="https://$ngrok_url"
fi

ngrok_host="${ngrok_url#https://}"
ngrok_host="${ngrok_host#http://}"
redirect_uri="${ngrok_url}/api/auth/spotify/callback"

if [[ ! -f .env.local ]]; then
  cp .env.example .env.local
fi

if grep -q '^SPOTIFY_REDIRECT_URI=' .env.local; then
  perl -0pi -e "s|^SPOTIFY_REDIRECT_URI=.*\$|SPOTIFY_REDIRECT_URI=${redirect_uri}|m" .env.local
else
  printf '\nSPOTIFY_REDIRECT_URI=%s\n' "$redirect_uri" >> .env.local
fi

if [[ -f next.config.ts ]]; then
  if grep -q 'allowedDevOrigins' next.config.ts; then
    perl -0pi -e "s|allowedDevOrigins:\s*\[[^\]]*\]|allowedDevOrigins: ['${ngrok_host}']|s" next.config.ts
  fi
fi

echo "✅ Updated SPOTIFY_REDIRECT_URI to ${redirect_uri}"
echo "✅ Updated allowedDevOrigins to ${ngrok_host}"
