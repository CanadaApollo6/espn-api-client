import ky from 'ky';
import { describe, expect, it, vi } from 'vitest';
import type { ESPNClientOptions } from '../src/index';
import {
  DEFAULT_BASE_URLS,
  DEFAULT_LEAGUE,
  DEFAULT_SPORT,
  DEFAULT_USER_AGENT,
  ESPNAPIError,
  ESPNClient,
  InvalidResponseError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  RequestAbortedError,
  RequestTimeoutError,
} from '../src/index';

type FetchImplementation = NonNullable<NonNullable<Parameters<typeof ky.create>[0]>['fetch']>;

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Response(JSON.stringify(value), { ...init, headers });
}

function createClient(
  fetchImplementation: FetchImplementation,
  options: Omit<ESPNClientOptions, 'httpClient'> = {},
): ESPNClient {
  return new ESPNClient({
    ...options,
    httpClient: ky.create({ fetch: fetchImplementation }),
  });
}

function requireRequest(input: RequestInfo | URL): Request {
  if (!(input instanceof Request)) {
    throw new TypeError('Expected Ky to call fetch with a Request.');
  }
  return input;
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the promise to reject.');
}

describe('ESPNClient configuration', () => {
  it('uses the documented default scope and base URLs', () => {
    const client = new ESPNClient();

    expect(client.sport).toBe(DEFAULT_SPORT);
    expect(client.league).toBe(DEFAULT_LEAGUE);
    expect(client.baseUrls).toEqual(DEFAULT_BASE_URLS);
    expect(Object.isFrozen(client.baseUrls)).toBe(true);
  });

  it('normalizes configured values and a partial base URL override', () => {
    const client = new ESPNClient({
      sport: ' basketball ',
      league: ' nba ',
      baseUrls: { site: 'https://mock.espn.test/api/' },
    });

    expect(client.sport).toBe('basketball');
    expect(client.league).toBe('nba');
    expect(client.baseUrls).toEqual({
      ...DEFAULT_BASE_URLS,
      site: 'https://mock.espn.test/api',
    });
  });

  it.each([
    [{ sport: '   ' }, 'sport must be a non-empty string.'],
    [{ league: '' }, 'league must be a non-empty string.'],
    [{ timeoutMs: 0 }, 'timeoutMs must be a positive integer.'],
    [{ timeoutMs: 1.5 }, 'timeoutMs must be a positive integer.'],
    [{ timeoutMs: 2_147_483_648 }, 'timeoutMs must be <= 2147483647.'],
    [{ maxRetries: -1 }, 'maxRetries must be a non-negative integer.'],
    [{ maxRetries: 1.5 }, 'maxRetries must be a non-negative integer.'],
    [{ retryDelayMs: -1 }, 'retryDelayMs must be a non-negative integer.'],
  ] satisfies readonly [ESPNClientOptions, string][])(
    'rejects invalid option %o',
    (options, message) => {
      expect(() => new ESPNClient(options)).toThrow(message);
    },
  );

  it.each([
    ['not a URL', 'baseUrls.site must be a valid URL.'],
    ['ftp://mock.espn.test', 'baseUrls.site must use HTTP or HTTPS.'],
    ['https://mock.espn.test?', 'baseUrls.site must not include a query string or fragment.'],
    ['https://mock.espn.test#', 'baseUrls.site must not include a query string or fragment.'],
  ])('rejects invalid base URL %s', (site, message) => {
    expect(() => new ESPNClient({ baseUrls: { site } })).toThrow(message);
  });
});

describe('ESPNClient request transport', () => {
  it('performs a typed raw request with serialized query values', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const request = requireRequest(input);
      expect(request.method).toBe('GET');
      expect(request.redirect).toBe('error');
      expect(request.url).toBe(
        'https://mock.espn.test/v2/resource?name=Aaron+Rodgers&limit=25&active=false&tag=one&tag=two',
      );
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    const client = createClient(fetchMock, {
      baseUrls: { web: 'https://mock.espn.test/' },
      maxRetries: 0,
    });

    const result = await client.request<{ readonly ok: boolean }>('web', '/v2/resource', {
      name: 'Aaron Rodgers',
      limit: 25,
      active: false,
      tag: ['one', null, undefined, 'two'],
      omitted: undefined,
      alsoOmitted: null,
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('sets defaults and merges client and request headers case-insensitively', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const request = requireRequest(input);
      expect(request.headers.get('accept')).toBe('application/json');
      expect(request.headers.get('user-agent')).toBe(DEFAULT_USER_AGENT);
      expect(request.headers.get('authorization')).toBe('Bearer request');
      expect(request.headers.get('x-client')).toBe('client-value');
      expect(request.headers.get('x-request')).toBe('request-value');
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    const client = createClient(fetchMock, {
      headers: {
        authorization: 'Bearer client',
        'x-client': 'client-value',
      },
      maxRetries: 0,
    });

    await client.request('site', '/headers', undefined, {
      headers: {
        Authorization: 'Bearer request',
        'x-request': 'request-value',
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('preserves explicitly configured Accept and User-Agent headers', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const request = requireRequest(input);
      expect(request.headers.get('accept')).toBe('application/vnd.espn.test+json');
      expect(request.headers.get('user-agent')).toBe('custom-agent/1.0');
      return Promise.resolve(jsonResponse({ ok: true }));
    });
    const client = createClient(fetchMock, {
      headers: {
        accept: 'application/vnd.espn.test+json',
        'user-agent': 'custom-agent/1.0',
      },
      maxRetries: 0,
    });

    await client.request('core', '/headers');
  });

  it('retries retryable responses and returns the successful response', async () => {
    const fetchMock = vi
      .fn<FetchImplementation>()
      .mockResolvedValueOnce(new Response('temporarily unavailable', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ recovered: true }));
    const client = createClient(fetchMock, {
      maxRetries: 2,
      retryDelayMs: 0,
      timeoutMs: 1_000,
    });

    await expect(client.request('site', '/retry')).resolves.toEqual({ recovered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('allows request options to disable configured retries', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          new Response('unavailable', { status: 503, statusText: 'Service Unavailable' }),
        ),
    );
    const client = createClient(fetchMock, {
      maxRetries: 2,
      retryDelayMs: 0,
    });

    const error = await captureError(
      client.request('site', '/no-retry', undefined, { maxRetries: 0 }),
    );

    expect(error).toBeInstanceOf(ESPNAPIError);
    expect(error).toMatchObject({ code: 'HTTP_ERROR', status: 503, attempts: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('replaces retry policy inherited from an injected Ky instance', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(jsonResponse({ message: 'bad request' }, { status: 400 })),
    );
    const client = new ESPNClient({
      maxRetries: 2,
      retryDelayMs: 0,
      httpClient: ky.create({
        fetch: fetchMock,
        retry: {
          limit: 2,
          delay: () => 0,
          shouldRetry: () => true,
        },
      }),
    });

    const error = await captureError(client.request('site', '/bad-request'));

    expect(error).toMatchObject({ code: 'HTTP_ERROR', status: 400, attempts: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('reports the total attempt count after exhausting retries', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          new Response('unavailable', { status: 500, statusText: 'Internal Server Error' }),
        ),
    );
    const client = createClient(fetchMock, {
      maxRetries: 2,
      retryDelayMs: 0,
      timeoutMs: 1_000,
    });

    const error = await captureError(client.request('site', '/retry-exhausted'));

    expect(error).toMatchObject({ code: 'HTTP_ERROR', status: 500, attempts: 3 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('maps a 404 response to NotFoundError with response details', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          jsonResponse({ message: 'missing' }, { status: 404, statusText: 'Not Found' }),
        ),
    );
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(client.request('site', '/missing'));

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({
      name: 'NotFoundError',
      code: 'NOT_FOUND',
      status: 404,
      url: 'https://site.api.espn.com/missing',
      attempts: 1,
      responseBody: '{"message":"missing"}',
    });
  });

  it('preserves HTTP error mapping when an injected Ky instance disables it by default', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          jsonResponse({ message: 'missing' }, { status: 404, statusText: 'Not Found' }),
        ),
    );
    const client = new ESPNClient({
      maxRetries: 0,
      httpClient: ky.create({ fetch: fetchMock, throwHttpErrors: false }),
    });

    await expect(client.request('site', '/missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps a 429 response to RateLimitError and parses Retry-After seconds', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          jsonResponse(
            { message: 'slow down' },
            {
              status: 429,
              statusText: 'Too Many Requests',
              headers: { 'retry-after': '2' },
            },
          ),
        ),
    );
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(client.request('site', '/limited'));

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error).toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      attempts: 1,
      retryAfterMs: 2_000,
      responseBody: '{"message":"slow down"}',
    });
  });

  it('maps other HTTP failures to ESPNAPIError', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          new Response('upstream broke', {
            status: 502,
            statusText: 'Bad Gateway',
            headers: { 'content-type': 'text/plain' },
          }),
        ),
    );
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(client.request('site', '/failure'));

    expect(error).toBeInstanceOf(ESPNAPIError);
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(RateLimitError);
    expect(error).toMatchObject({
      name: 'ESPNAPIError',
      message: 'ESPN returned HTTP 502 Bad Gateway.',
      code: 'HTTP_ERROR',
      status: 502,
      attempts: 1,
      responseBody: 'upstream broke',
    });
  });

  it('maps malformed successful JSON to InvalidResponseError', async () => {
    const fetchMock = vi.fn(
      (): Promise<Response> =>
        Promise.resolve(
          new Response('{not valid JSON', {
            headers: { 'content-type': 'application/json' },
          }),
        ),
    );
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(client.request('site', '/invalid-json'));

    expect(error).toBeInstanceOf(InvalidResponseError);
    expect(error).toMatchObject({
      code: 'INVALID_RESPONSE',
      message: 'ESPN returned invalid JSON.',
      attempts: 1,
    });
  });

  it('maps Ky total timeout failures to RequestTimeoutError', async () => {
    const fetchMock = vi.fn((): Promise<Response> => {
      return new Promise<Response>(() => {
        // Intentionally left pending so Ky enforces the total deadline.
      });
    });
    const client = createClient(fetchMock, { maxRetries: 0, timeoutMs: 10 });

    const error = await captureError(client.request('site', '/slow'));

    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect(error).toMatchObject({
      code: 'TIMEOUT',
      message: 'The ESPN request exceeded its 10 ms deadline.',
      attempts: 1,
    });
  });

  it('applies the total deadline while reading a stalled response body', async () => {
    const fetchMock = vi.fn((): Promise<Response> => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"started":true'));
        },
      });
      return Promise.resolve(
        new Response(body, { headers: { 'content-type': 'application/json' } }),
      );
    });
    const client = createClient(fetchMock, { maxRetries: 0, timeoutMs: 10 });

    const error = await captureError(client.request('site', '/stalled-body'));

    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect(error).toMatchObject({ code: 'TIMEOUT', attempts: 1 });
  });

  it('maps an aborted caller signal to RequestAbortedError', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('Caller aborted', 'AbortError'));
    const fetchMock = vi.fn(
      (): Promise<Response> => Promise.reject(new DOMException('Caller aborted', 'AbortError')),
    );
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(
      client.request('site', '/aborted', undefined, { signal: controller.signal }),
    );

    expect(error).toBeInstanceOf(RequestAbortedError);
    expect(error).toMatchObject({ code: 'ABORTED', attempts: 1 });
  });

  it('maps recognized fetch failures to NetworkError without live I/O', async () => {
    const fetchMock = vi.fn((): Promise<Response> => Promise.reject(new TypeError('fetch failed')));
    const client = createClient(fetchMock, { maxRetries: 0 });

    const error = await captureError(client.request('site', '/offline'));

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({
      code: 'NETWORK_ERROR',
      url: 'https://site.api.espn.com/offline',
      attempts: 1,
    });
  });

  it.each([
    ['relative', 'path must start with exactly one forward slash.'],
    ['//other.example/path', 'path must start with exactly one forward slash.'],
  ])('rejects invalid request path %s', async (path, message) => {
    const fetchMock = vi.fn((): Promise<Response> => Promise.resolve(jsonResponse({ ok: true })));
    const client = createClient(fetchMock, { maxRetries: 0 });

    await expect(client.request('site', path)).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ timeoutMs: 0 }, 'timeoutMs must be a positive integer.'],
    [{ maxRetries: -1 }, 'maxRetries must be a non-negative integer.'],
    [{ retryDelayMs: -1 }, 'retryDelayMs must be a non-negative integer.'],
  ] satisfies readonly [ESPNClientOptions, string][])(
    'rejects invalid request option %o',
    async (options, message) => {
      const fetchMock = vi.fn((): Promise<Response> => Promise.resolve(jsonResponse({ ok: true })));
      const client = createClient(fetchMock, { maxRetries: 0 });

      await expect(client.request('site', '/resource', undefined, options)).rejects.toThrow(
        message,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
