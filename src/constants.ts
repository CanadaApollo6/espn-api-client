import type { ESPNBaseUrls } from './types/client';

/** Default ESPN API origins used by the built-in endpoint clients. */
export const DEFAULT_BASE_URLS: Readonly<ESPNBaseUrls> = Object.freeze({
  site: 'https://site.api.espn.com',
  web: 'https://site.web.api.espn.com',
  core: 'https://sports.core.api.espn.com',
});

export const DEFAULT_SPORT = 'football';
export const DEFAULT_LEAGUE = 'nfl';
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 250;

export const DEFAULT_USER_AGENT =
  'espn-api-client/0.1 (+https://github.com/CanadaApollo6/espn-api-client)';
