# ESPN API Client Development Guide

This file records the current architecture and guardrails for maintainers and coding agents. The source, tests, and `package.json` are the final authority when this guide disagrees with the repository.

## Current scope

Version 0.1 is one TypeScript package for Node.js 22+ and compatible browser or edge runtimes. It wraps public, unofficial ESPN JSON endpoints.

The client currently supports:

- Scoreboards
- Standings
- Teams, rosters, schedules, and statistics
- News by league, team, or athlete
- Athlete profiles, statistics, and game logs
- Game summaries and core event records
- Raw GET requests to configured ESPN origins

It does not include a Python client, fantasy APIs, GraphQL, WebSockets, response caching, request batching, automatic pagination, or normalized domain models.

## Public behavior

- `new ESPNClient()` defaults to `sport: 'football'` and `league: 'nfl'`.
- A client is scoped to one sport and league for its lifetime.
- Node.js 22 and 24 are the supported CI runtimes.
- The package ships ESM and TypeScript declarations targeting ES2022. Ky 2 is ESM-only, so do not add a fake CommonJS entry point.
- Biome is the only formatter, linter, and import organizer.
- `npm run typecheck` uses TypeScript 7. TypeScript 6 remains only as the compatibility API used by `tsup` for declaration bundling.
- Endpoint methods return partial, readonly, ESPN-shaped response types.
- `client.request<T>()` is the raw escape hatch. Its generic is an assertion, not runtime validation.
- ESPN is an unstable upstream dependency. Do not promise that an observed field or route is permanent.

## Request flow

```text
Endpoint method
  -> validates caller parameters
  -> builds an ESPN path and query
  -> ESPNClient.request()
  -> Ky GET with total timeout and retry policy
  -> ESPN-specific error mapping
  -> endpoint response guard
  -> partial ESPN-shaped result
```

`ESPNClient` owns transport concerns. Endpoint modules own only their route, query mapping, parameter checks, and response-envelope guard.

The client uses three named origins:

- `site`: `https://site.api.espn.com`
- `web`: `https://site.web.api.espn.com`
- `core`: `https://sports.core.api.espn.com`

Base URLs and the Ky instance are injectable for tests, proxies, and instrumentation. Treat injected Ky hooks as trusted code because they can transform requests and responses. Raw request paths must begin with exactly one `/`; do not add arbitrary absolute-URL requests.

## Reliability rules

The defaults are a 10-second total deadline, two retries after the initial GET, and a 250 ms exponential backoff base with jitter.

Retryable HTTP statuses are `408`, `429`, `500`, `502`, `503`, and `504`. Honor `Retry-After` for `429` and `503`. Do not retry timeouts, caller aborts, response-validation errors, or other 4xx responses.

Reject redirects so a request cannot leave its selected ESPN origin. Replace inherited Ky retry configuration rather than merging it; an injected client may add instrumentation hooks but must not silently broaden the package retry policy.

Transport, HTTP, and response failures must extend `ESPNAPIError` and expose a stable `code`. Invalid local configuration and arguments throw `TypeError`. Preserve useful context such as status, URL, attempt count, retry delay, and cause. Keep retained response bodies bounded.

## Endpoint rules

- Route all network access through `ESPNClient.request()`.
- Keep ESPN's query spelling at the boundary; for example, public `seasonType` maps to ESPN's `seasontype`.
- Accept ESPN IDs as `string | number`, then validate and encode them with the shared helper.
- Validate numeric ranges that are known, such as positive limits and season types 1 through 4.
- Preserve unknown query keys because sports expose different options.
- Do not add a shared base endpoint class unless at least three endpoint modules need the same behavior.
- Add a new named API origin only when an implemented route requires it.

## Response types and validation

Types describe fields observed in real responses and used by consumers. They are not full schemas for ESPN's payloads.

- Required typed fields must be checked by the endpoint response guard.
- Optional or sport-specific sections remain optional or `unknown`.
- Response interfaces stay open to additional upstream fields.
- Do not cast an unexamined raw response straight to a detailed public interface.
- Do not add a schema dependency until repeated parsing complexity justifies it.
- Do not normalize dates, IDs, enums, or nested structures unless a concrete consumer need establishes the contract.

When ESPN drifts, first capture the observed response and add a regression test. Then adjust the narrowest parser or type necessary.

## Testing rules

The default test suite is deterministic and offline. Cover:

- URL and query construction
- Parameter validation and path encoding
- Retryable and non-retryable responses
- Total timeout and caller abort behavior
- Error subclasses and context
- Minimal response-shape validation
- Public type inference where it is easy to regress

Live smoke tests are opt-in through `npm run test:live`. Keep them low-volume and outside CI. A live failure is evidence to investigate, not permission to weaken a response guard blindly.

Run this before handing off a change:

```bash
npm run check
```

For parser or transport changes, also run:

```bash
npm run test:coverage
```

## Packaging rules

- Keep runtime dependencies minimal. Ky is the intentional HTTP dependency.
- Keep `sideEffects: false` true unless initialization gains a real side effect.
- Preserve the ESM and declaration export paths.
- Keep the installed-tarball JavaScript and TypeScript consumer smoke passing.
- Keep `npm run check:biome` and the TypeScript 7 typecheck passing.
- Run `publint` after building.
- Do not publish, tag, or create a release unless the maintainer explicitly requests it.

## Documentation rules

- Examples must match exported names and signatures.
- State the `football` / `nfl` defaults wherever initialization is introduced.
- Clearly distinguish partial typing from full runtime validation.
- Clearly state that ESPN's APIs are unofficial and this project has no ESPN affiliation.
- Do not list roadmap features as if they already exist.
- Update `CHANGELOG.md` for user-visible changes.

Favor a small, honest client over speculative completeness.
