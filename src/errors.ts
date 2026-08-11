export type ESPNErrorCode =
  | 'HTTP_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE';

export interface ESPNErrorDetails {
  readonly status?: number | undefined;
  readonly url?: string | undefined;
  readonly attempts?: number | undefined;
  readonly retryAfterMs?: number | undefined;
  readonly responseBody?: string | undefined;
  readonly cause?: unknown;
}

/** Base class for all errors created by this package. */
export class ESPNAPIError extends Error {
  public readonly code: ESPNErrorCode;
  public readonly status: number | undefined;
  public readonly url: string | undefined;
  public readonly attempts: number | undefined;
  public readonly retryAfterMs: number | undefined;
  public readonly responseBody: string | undefined;

  public constructor(
    message: string,
    code: ESPNErrorCode = 'HTTP_ERROR',
    details: ESPNErrorDetails = {},
  ) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = 'ESPNAPIError';
    this.code = code;
    this.status = details.status;
    this.url = details.url;
    this.attempts = details.attempts;
    this.retryAfterMs = details.retryAfterMs;
    this.responseBody = details.responseBody;
  }
}

export class NotFoundError extends ESPNAPIError {
  public constructor(details: ESPNErrorDetails = {}) {
    super('The requested ESPN resource was not found.', 'NOT_FOUND', {
      ...details,
      status: 404,
    });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ESPNAPIError {
  public constructor(details: ESPNErrorDetails = {}) {
    super('ESPN rate limited the request.', 'RATE_LIMITED', {
      ...details,
      status: 429,
    });
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends ESPNAPIError {
  public constructor(details: ESPNErrorDetails = {}) {
    super('The ESPN request failed before a response was received.', 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class RequestTimeoutError extends ESPNAPIError {
  public constructor(timeoutMs: number, details: ESPNErrorDetails = {}) {
    super(`The ESPN request exceeded its ${String(timeoutMs)} ms deadline.`, 'TIMEOUT', details);
    this.name = 'RequestTimeoutError';
  }
}

export class RequestAbortedError extends ESPNAPIError {
  public constructor(details: ESPNErrorDetails = {}) {
    super('The ESPN request was aborted.', 'ABORTED', details);
    this.name = 'RequestAbortedError';
  }
}

export class InvalidResponseError extends ESPNAPIError {
  public constructor(message: string, details: ESPNErrorDetails = {}) {
    super(message, 'INVALID_RESPONSE', details);
    this.name = 'InvalidResponseError';
  }
}
