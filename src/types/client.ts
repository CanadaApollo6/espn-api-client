import type { KyInstance } from 'ky';

/** ESPN origins used by the supported endpoint families. */
export interface ESPNBaseUrls {
  readonly site: string;
  readonly web: string;
  readonly core: string;
}

export type ESPNDomain = keyof ESPNBaseUrls;
export type ESPNId = string | number;

export type QueryPrimitive = string | number | boolean;
export type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | readonly (QueryPrimitive | null | undefined)[];
export type QueryParams = Readonly<Record<string, QueryValue>>;

export interface ESPNClientOptions {
  /** ESPN sport slug. Defaults to `football`. */
  readonly sport?: string;
  /** ESPN league slug. Defaults to `nfl`. */
  readonly league?: string;
  /** Total deadline across all attempts. Defaults to 10 seconds. */
  readonly timeoutMs?: number;
  /** Retries after the initial request. Defaults to 2. */
  readonly maxRetries?: number;
  /** Base delay for exponential retry backoff. Defaults to 250 ms. */
  readonly retryDelayMs?: number;
  /** Headers merged into every request. */
  readonly headers?: HeadersInit;
  /** Override one or more ESPN API origins. Useful for tests and proxies. */
  readonly baseUrls?: Partial<ESPNBaseUrls>;
  /** Custom Ky instance. Useful for hooks, instrumentation, and tests. */
  readonly httpClient?: KyInstance;
}

export interface ESPNRequestOptions {
  readonly signal?: AbortSignal | undefined;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
  readonly headers?: HeadersInit;
}
