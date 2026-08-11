import type { KyInstance } from 'ky';
import ky, { isHTTPError, isNetworkError, isTimeoutError, replaceOption } from 'ky';

import {
  DEFAULT_BASE_URLS,
  DEFAULT_LEAGUE,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_SPORT,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from './constants';
import { AthletesAPI } from './endpoints/athletes';
import { GamesAPI } from './endpoints/games';
import { NewsAPI } from './endpoints/news';
import { ScoreboardAPI } from './endpoints/scoreboard';
import { StandingsAPI } from './endpoints/standings';
import { TeamsAPI } from './endpoints/teams';
import {
  ESPNAPIError,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  RequestAbortedError,
  RequestTimeoutError,
} from './errors';
import type {
  ESPNBaseUrls,
  ESPNClientOptions,
  ESPNDomain,
  ESPNRequestOptions,
  QueryParams,
} from './types/client';
import { createSearchParams } from './utils/query';
import { requireNonEmptyString } from './utils/validation';

const MAX_ERROR_BODY_LENGTH = 8_192;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

function requirePositiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer.`);
  }
  return value;
}

function requireNonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer.`);
  }
  return value;
}

function requireTimeoutMs(value: number): number {
  const timeoutMs = requirePositiveInteger(value, 'timeoutMs');
  if (timeoutMs > MAX_TIMEOUT_MS) {
    throw new TypeError(`timeoutMs must be <= ${String(MAX_TIMEOUT_MS)}.`);
  }
  return timeoutMs;
}

function normalizeBaseUrl(value: string, domain: ESPNDomain): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new TypeError(`baseUrls.${domain} must be a valid URL.`, { cause: error });
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new TypeError(`baseUrls.${domain} must use HTTP or HTTPS.`);
  }
  if (value.includes('?') || value.includes('#')) {
    throw new TypeError(`baseUrls.${domain} must not include a query string or fragment.`);
  }

  return url.href.replace(/\/+$/u, '');
}

function createBaseUrls(overrides: Partial<ESPNBaseUrls> | undefined): Readonly<ESPNBaseUrls> {
  return Object.freeze({
    site: normalizeBaseUrl(overrides?.site ?? DEFAULT_BASE_URLS.site, 'site'),
    web: normalizeBaseUrl(overrides?.web ?? DEFAULT_BASE_URLS.web, 'web'),
    core: normalizeBaseUrl(overrides?.core ?? DEFAULT_BASE_URLS.core, 'core'),
  });
}

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && process.release.name === 'node';
}

function createDefaultHeaders(headers: HeadersInit | undefined): Headers {
  const result = new Headers(headers);
  if (!result.has('accept')) {
    result.set('accept', 'application/json');
  }
  if (isNodeRuntime() && !result.has('user-agent')) {
    result.set('user-agent', DEFAULT_USER_AGENT);
  }
  return result;
}

function mergeHeaders(defaults: Headers, overrides: HeadersInit | undefined): Headers {
  const result = new Headers(defaults);
  if (overrides !== undefined) {
    new Headers(overrides).forEach((value, key) => {
      result.set(key, value);
    });
  }
  return result;
}

function buildUrl(baseUrl: string, path: string): URL {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new TypeError('path must start with exactly one forward slash.');
  }
  return new URL(`${baseUrl}${path}`);
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return Math.max(0, timestamp - Date.now());
}

function stringifyErrorData(data: unknown): string | undefined {
  if (data === undefined) {
    return undefined;
  }

  let value: string;
  if (typeof data === 'string') {
    value = data;
  } else {
    try {
      value = JSON.stringify(data);
    } catch {
      value = '<unserializable response body>';
    }
  }

  return value.length > MAX_ERROR_BODY_LENGTH ? `${value.slice(0, MAX_ERROR_BODY_LENGTH)}…` : value;
}

/**
 * A client scoped to one ESPN sport and league.
 *
 * It defaults to `football` / `nfl`; configure both slugs for another league.
 */
export class ESPNClient {
  public readonly sport: string;
  public readonly league: string;
  public readonly baseUrls: Readonly<ESPNBaseUrls>;

  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly headers: Headers;
  private readonly httpClient: KyInstance;

  private newsApi: NewsAPI | undefined;
  private teamsApi: TeamsAPI | undefined;
  private scoreboardApi: ScoreboardAPI | undefined;
  private athletesApi: AthletesAPI | undefined;
  private gamesApi: GamesAPI | undefined;
  private standingsApi: StandingsAPI | undefined;

  public constructor(options: ESPNClientOptions = {}) {
    this.sport = requireNonEmptyString(options.sport ?? DEFAULT_SPORT, 'sport');
    this.league = requireNonEmptyString(options.league ?? DEFAULT_LEAGUE, 'league');
    this.timeoutMs = requireTimeoutMs(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    this.maxRetries = requireNonNegativeInteger(
      options.maxRetries ?? DEFAULT_MAX_RETRIES,
      'maxRetries',
    );
    this.retryDelayMs = requireNonNegativeInteger(
      options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
      'retryDelayMs',
    );
    this.baseUrls = createBaseUrls(options.baseUrls);
    this.headers = createDefaultHeaders(options.headers);
    this.httpClient = options.httpClient ?? ky.create();
  }

  public get news(): NewsAPI {
    this.newsApi ??= new NewsAPI(this);
    return this.newsApi;
  }

  public get teams(): TeamsAPI {
    this.teamsApi ??= new TeamsAPI(this);
    return this.teamsApi;
  }

  public get scoreboard(): ScoreboardAPI {
    this.scoreboardApi ??= new ScoreboardAPI(this);
    return this.scoreboardApi;
  }

  public get athletes(): AthletesAPI {
    this.athletesApi ??= new AthletesAPI(this);
    return this.athletesApi;
  }

  public get games(): GamesAPI {
    this.gamesApi ??= new GamesAPI(this);
    return this.gamesApi;
  }

  public get standings(): StandingsAPI {
    this.standingsApi ??= new StandingsAPI(this);
    return this.standingsApi;
  }

  /**
   * Make a GET request against one of the configured ESPN origins.
   *
   * The generic type is a compile-time assertion. Use `unknown` when calling an
   * unwrapped endpoint and validate any fields your application depends on.
   */
  public async request<T = unknown>(
    domain: ESPNDomain,
    path: string,
    query?: QueryParams,
    options: ESPNRequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(this.baseUrls[domain], path);
    const timeoutMs = requireTimeoutMs(options.timeoutMs ?? this.timeoutMs);
    const maxRetries = requireNonNegativeInteger(
      options.maxRetries ?? this.maxRetries,
      'maxRetries',
    );
    const retryDelayMs = requireNonNegativeInteger(
      options.retryDelayMs ?? this.retryDelayMs,
      'retryDelayMs',
    );
    let attempts = 1;
    let abortKind: 'caller' | 'timeout' | undefined;
    const requestController = new AbortController();
    const abortFromCaller = (): void => {
      if (abortKind === undefined) {
        abortKind = 'caller';
        requestController.abort(options.signal?.reason);
      }
    };

    if (options.signal?.aborted === true) {
      abortFromCaller();
    } else {
      options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeout = setTimeout(() => {
      if (abortKind === undefined) {
        abortKind = 'timeout';
        requestController.abort(new Error(`ESPN request exceeded ${String(timeoutMs)} ms.`));
      }
    }, timeoutMs);

    let rejectOnAbort: (() => void) | undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
      rejectOnAbort = () => {
        const reason = requestController.signal.reason as unknown;
        reject(
          reason instanceof Error
            ? reason
            : new Error('The ESPN request was aborted.', { cause: reason }),
        );
      };

      if (requestController.signal.aborted) {
        rejectOnAbort();
      } else {
        requestController.signal.addEventListener('abort', rejectOnAbort, { once: true });
      }
    });

    try {
      const response = this.httpClient
        .get<T>(url, {
          headers: mergeHeaders(this.headers, options.headers),
          searchParams: createSearchParams(query),
          signal: requestController.signal,
          redirect: 'error',
          throwHttpErrors: true,
          timeout: false,
          totalTimeout: false,
          retry: replaceOption({
            limit: maxRetries,
            methods: ['get'],
            statusCodes: RETRYABLE_STATUS_CODES,
            afterStatusCodes: [429, 503],
            maxRetryAfter: Math.min(timeoutMs, MAX_RETRY_DELAY_MS),
            backoffLimit: MAX_RETRY_DELAY_MS,
            delay: (attemptCount) => retryDelayMs * 2 ** (attemptCount - 1),
            jitter: true,
            retryOnTimeout: false,
          }),
          hooks: {
            beforeRetry: [
              ({ retryCount }) => {
                attempts = retryCount + 1;
              },
            ],
          },
        })
        .json<T>();
      return await Promise.race([response, aborted]);
    } catch (error) {
      if (error instanceof ESPNAPIError) {
        throw error;
      }

      const details = {
        url: url.href,
        attempts,
        cause: error,
      };

      if (abortKind === 'timeout' || isTimeoutError(error)) {
        throw new RequestTimeoutError(timeoutMs, details);
      }

      if (abortKind === 'caller') {
        throw new RequestAbortedError(details);
      }

      if (isHTTPError(error)) {
        const status = error.response.status;
        const httpDetails = {
          ...details,
          status,
          retryAfterMs: parseRetryAfter(error.response.headers.get('retry-after')),
          responseBody: stringifyErrorData(error.data),
        };

        if (status === 404) {
          throw new NotFoundError(httpDetails);
        }
        if (status === 429) {
          throw new RateLimitError(httpDetails);
        }

        throw new ESPNAPIError(
          `ESPN returned HTTP ${String(status)}${error.response.statusText === '' ? '' : ` ${error.response.statusText}`}.`,
          'HTTP_ERROR',
          httpDetails,
        );
      }

      if (isNetworkError(error)) {
        throw new NetworkError(details);
      }

      if (error instanceof SyntaxError) {
        throw new InvalidResponseError('ESPN returned invalid JSON.', details);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
      if (rejectOnAbort !== undefined) {
        requestController.signal.removeEventListener('abort', rejectOnAbort);
      }
    }
  }
}
