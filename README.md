# ESPN API Client

A small TypeScript client for ESPN's public, unofficial JSON APIs.

> **Status:** v0.1 is an early API. ESPN does not publish or support these endpoints, so routes and response shapes can change without notice. This project is not affiliated with, endorsed by, or sponsored by ESPN or The Walt Disney Company.

The client currently provides:

- Scoreboards and schedules
- League standings
- Teams, rosters, schedules, and statistics
- League, team, and athlete news
- Athlete profiles, statistics, and game logs
- Game summaries and core event records
- A typed raw-request escape hatch for routes that do not have a wrapper yet

Requests are made with [Ky](https://github.com/sindresorhus/ky). The package adds ESPN-specific URL construction, query handling, retries, timeouts, response guards, types, and errors.

## Installation

The first npm release has not been published yet. After it is published:

```bash
npm install espn-api-client
```

To work from this repository today:

```bash
git clone https://github.com/CanadaApollo6/espn-api-client.git
cd espn-api-client
npm ci
npm run build
```

Node.js 22 or newer is required.

## Quick start

```typescript
import { ESPNClient } from 'espn-api-client';

// Defaults to football / nfl.
const espn = new ESPNClient();

const scoreboard = await espn.scoreboard.get({ limit: 10 });

for (const event of scoreboard.events) {
  console.log(event.id, event.name, event.date);
}
```

Each client is scoped to one ESPN sport and league. Use ESPN's route slugs to target another league:

```typescript
const nba = new ESPNClient({
  sport: 'basketball',
  league: 'nba',
});

const standings = await nba.standings.get({ season: 2025 });
```

Endpoint availability and response details vary by sport and league.

See [`examples/basic.ts`](./examples/basic.ts) for a complete usage example.

## API

Endpoint methods return ESPN-shaped objects. They do not normalize ESPN data into a separate domain model.

| Group | Methods |
| --- | --- |
| `espn.scoreboard` | `get(params?)` |
| `espn.standings` | `get(params?)` |
| `espn.teams` | `getAll(params?)`, `getById(teamId, params?)`, `getRoster(teamId, params?)`, `getSchedule(teamId, params?)`, `getStatistics(teamId, params?)` |
| `espn.news` | `get(params?)`, `getForTeam(teamId, params?)`, `getForAthlete(athleteId, params?)` |
| `espn.athletes` | `getById(athleteId, params?)`, `getStats(athleteId, params?)`, `getGameLog(athleteId, params?)` |
| `espn.games` | `getSummary(eventId, params?)`, `getById(eventId, params?)` |

Common examples:

```typescript
const chiefs = await espn.teams.getById(12);
console.log(chiefs.team.displayName);

const roster = await espn.teams.getRoster(12, { season: 2025 });
const news = await espn.news.getForTeam(12, { limit: 5 });
const athlete = await espn.athletes.getById(3139477);
const game = await espn.games.getSummary('401772510');
```

IDs may be strings or numbers. Query parameter objects also accept additional ESPN query keys, since the upstream API exposes sport-specific options that are not all modeled here.

### Scoreboard dates

`scoreboard.get()` accepts ESPN's common date forms:

```typescript
await espn.scoreboard.get({ dates: 2026 });
await espn.scoreboard.get({ dates: '20260910' });
await espn.scoreboard.get({ dates: '20260910-20260917' });
await espn.scoreboard.get({ seasonType: 2, week: 1 });
```

### Raw requests

Use `request()` for an ESPN route that is not wrapped yet:

```typescript
const controller = new AbortController();

const result = await espn.request(
  'site',
  '/apis/site/v2/sports/football/nfl/teams',
  { limit: 32 },
  {
    signal: controller.signal,
    timeoutMs: 5_000,
    maxRetries: 0,
  },
);
// result is unknown
```

The domain must be `site`, `web`, or `core`, and the path must begin with exactly one `/`.

You can supply a generic type, but it is only a compile-time assertion:

```typescript
import type { TeamsResponse } from 'espn-api-client';

const result = await espn.request<TeamsResponse>('site', '/apis/site/v2/sports/football/nfl/teams');
```

Unlike the built-in endpoint methods, a generic raw request does not validate the response shape. Use `unknown` and validate fields when correctness matters.

## Configuration

```typescript
const espn = new ESPNClient({
  sport: 'football',
  league: 'nfl',
  timeoutMs: 10_000,
  maxRetries: 2,
  retryDelayMs: 250,
  headers: {
    'x-example-header': 'value',
  },
});
```

| Option | Default | Meaning |
| --- | --- | --- |
| `sport` | `football` | ESPN sport slug used by endpoint paths |
| `league` | `nfl` | ESPN league slug used by endpoint paths |
| `timeoutMs` | `10000` | Total deadline across the initial request and all retries |
| `maxRetries` | `2` | Retry attempts after the initial GET |
| `retryDelayMs` | `250` | Base exponential backoff delay; jitter is applied |
| `headers` | `Accept: application/json` | Headers merged into every request |
| `baseUrls` | ESPN's site, web, and core API origins | Per-domain overrides for proxies and tests |
| `httpClient` | A default Ky instance | Custom Ky instance for hooks, instrumentation, or tests |

In Node.js, the client also sends an identifying `User-Agent` unless one is supplied.

Treat an injected Ky instance as trusted code. Its hooks still run and can transform requests or responses, and may affect reported attempt metadata. The client reasserts its request-level timeout, redirect, and retry options.

### Retries and timeouts

Only GET requests are made. The client retries transient network failures and HTTP `408`, `429`, `500`, `502`, `503`, and `504` responses. It honors `Retry-After` for `429` and `503`, uses exponential backoff with jitter, and caps retry delays at 30 seconds. Timeouts and caller aborts are not retried. Redirects are rejected so requests remain on the selected API origin.

The timeout is a total deadline across all attempts. Set `maxRetries: 0` to disable retries.

## Errors

HTTP, network, timeout, abort, and response errors created by the package extend `ESPNAPIError` and include a stable `code`. Invalid configuration, paths, IDs, and query ranges throw `TypeError`. Depending on the request failure, an `ESPNAPIError` may also include `status`, `url`, `attempts`, `retryAfterMs`, `responseBody`, and `cause`.

| Class | Code | Meaning |
| --- | --- | --- |
| `NotFoundError` | `NOT_FOUND` | ESPN returned HTTP 404 |
| `RateLimitError` | `RATE_LIMITED` | ESPN returned HTTP 429 |
| `NetworkError` | `NETWORK_ERROR` | No response was received |
| `RequestTimeoutError` | `TIMEOUT` | The total request deadline expired |
| `RequestAbortedError` | `ABORTED` | The caller's abort signal was triggered |
| `InvalidResponseError` | `INVALID_RESPONSE` | JSON or a required response shape was invalid |
| `ESPNAPIError` | `HTTP_ERROR` | Another non-success HTTP response |

```typescript
import { ESPNAPIError, ESPNClient } from 'espn-api-client';

const espn = new ESPNClient();

try {
  await espn.teams.getById('does-not-exist');
} catch (error) {
  if (error instanceof ESPNAPIError) {
    console.error(error.code, error.status, error.url);
  } else {
    throw error;
  }
}
```

## Type and runtime guarantees

The exported interfaces intentionally model only useful, observed parts of ESPN's payloads. They are readonly, remain open to additional properties, and use `unknown` for sections that have not been modeled safely.

Built-in endpoint methods perform lightweight checks on the response envelope and key identifiers. They do not fully validate every nested ESPN field. This keeps the client small while still catching major upstream drift. Treat optional and `unknown` data accordingly.

The package ships as ESM with TypeScript declarations targeting ES2022. Node.js 22+ is supported. Ky 2 is ESM-only, so this package does not claim a CommonJS entry point. Browser and edge use may work where the selected ESPN origin permits cross-origin requests, but ESPN's CORS behavior is not a supported contract.

## Development

```bash
npm ci
npm run check
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `npm run check:biome` | Check formatting, lint rules, and import organization |
| `npm run fix` | Apply Biome formatting, import organization, and safe lint fixes |
| `npm run format` | Format supported files with Biome |
| `npm run format:check` | Check formatting without writing files |
| `npm run lint` | Run the Biome linter with warnings treated as failures |
| `npm test` | Run deterministic tests; live tests remain skipped |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with coverage thresholds |
| `npm run test:live` | Opt in to low-volume requests against ESPN |
| `npm run typecheck` | Run strict TypeScript 7 checks without emitting files |
| `npm run build` | Build ESM, declarations, and source maps |
| `npm run test:package` | Install the tarball and smoke-test JS and TypeScript consumers |
| `npm run publint` | Validate the published package layout |
| `npm run check` | Run Biome, TypeScript 7, tests, build, and package validation |

Biome is the repository's formatter and linter. TypeScript 7 performs project and installed-consumer typechecks. The TypeScript 6 compatibility package remains installed only because `tsup` needs the compiler's programmatic API to bundle declarations.

Live tests contact ESPN's public servers. Run them deliberately; they are not part of CI or the normal test command.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and [Claude.md](./Claude.md) for architecture and maintenance rules.

## Responsible use

ESPN's APIs are unofficial and may be changed, restricted, rate-limited, or removed. Keep request volume low, cache results in your application where appropriate, and confirm that your use complies with applicable terms and licensing requirements. No availability or compatibility guarantee is provided.

## License

[MIT](./LICENSE) - Copyright (c) 2025 Riel St. Amand
