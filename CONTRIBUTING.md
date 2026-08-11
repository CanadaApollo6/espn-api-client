# Contributing to ESPN API Client

Contributions are welcome. Keep changes focused, evidence-based, and compatible with the project's small-client scope.

## Prerequisites

- Node.js 22 or newer
- npm
- Git

## Setup

```bash
git clone https://github.com/CanadaApollo6/espn-api-client.git
cd espn-api-client
npm ci
npm run check
```

Create a short-lived branch for your change:

```bash
git switch -c feature/add-endpoint
```

Common prefixes are `feature/`, `fix/`, `docs/`, `test/`, and `refactor/`.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run check:biome` | Check formatting, lint rules, and import organization |
| `npm run fix` | Apply Biome formatting, import organization, and safe lint fixes |
| `npm run format` | Format supported files with Biome |
| `npm run format:check` | Check formatting without writing files |
| `npm run lint` | Run the Biome linter with warnings treated as failures |
| `npm test` | Run the deterministic test suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests and enforce coverage thresholds |
| `npm run test:live` | Make opt-in requests against live ESPN endpoints |
| `npm run typecheck` | Type-check with TypeScript 7 without emitting files |
| `npm run build` | Build ESM, declarations, and source maps |
| `npm run test:package` | Install the tarball and test JS and TypeScript consumers |
| `npm run publint` | Validate the package export layout |
| `npm run check` | Run the required local and CI checks |

Run `npm run check` before opening a pull request.

## Repository layout

```text
src/
  client.ts       Ky transport, configuration, retries, and error mapping
  constants.ts    Default origins and request settings
  errors.ts       Public error hierarchy
  endpoints/      Endpoint-specific paths, queries, and response guards
  types/          Partial ESPN-shaped public response types
  utils/          Shared path, query, and validation helpers
tests/
  live/           Opt-in smoke tests against ESPN
examples/
  basic.ts        Basic consumer example
```

## Adding or changing an endpoint

1. Confirm the route and query behavior against a current ESPN response.
2. Put URL and query mapping in the relevant endpoint module.
3. Route requests through `ESPNClient.request()`; do not create a separate HTTP stack.
4. Add only the response fields that are observed and useful. Leave unmodeled fields as `unknown`.
5. Add a lightweight response guard for fields the method promises.
6. Cover path construction, query mapping, successful parsing, and malformed responses with deterministic tests.
7. Add or update an opt-in live smoke test when it materially improves drift detection.
8. Update the README and changelog when the public surface changes.

Create a new shared abstraction only after repeated code makes the boundary clear. Endpoint modules should remain small and should not normalize ESPN payloads into a new domain model.

## TypeScript conventions

- Use Biome for formatting, linting, and import organization. Do not add a second style tool.
- Keep strict TypeScript checks passing.
- Do not use `any`; use `unknown` and narrow it.
- Add explicit return types to public methods.
- Use readonly properties for response and configuration shapes.
- Treat ESPN IDs as strings in responses and accept `string | number` at method boundaries.
- Encode all path parameters with the shared path helper.
- Keep ESPN-specific query spellings inside endpoint modules.
- Do not suppress type errors with `@ts-ignore`.

The `typecheck` script uses TypeScript 7. The TypeScript 6 compatibility dependency exists only for tools such as `tsup` that still need the compiler's programmatic API.

The public types are intentionally partial. Adding dozens of speculative fields makes the package look safer than it is and creates maintenance work when ESPN changes an unofficial payload.

## Tests

The default suite must be deterministic and must not need internet access. Use the injected Ky instance or mocked responses to cover transport and endpoint behavior.

Live tests are different:

```bash
npm run test:live
```

They contact ESPN, should make only a few GET requests, and may fail because of upstream availability or response drift. They are deliberately excluded from CI and must never be required for a normal pull request.

When storing response fixtures, keep them small. Remove irrelevant article text, images, tracking data, and other large or volatile fields.

## Pull requests

A useful pull request includes:

- A clear description of the behavior change
- The ESPN route or response evidence behind endpoint changes
- Tests for success and failure behavior
- Documentation for public API changes
- A passing `npm run check`

Call out any behavior verified only against one sport or league. Do not claim general ESPN support from an NFL-only fixture.

Use concise conventional commit subjects when practical, for example:

```text
feat: add college football scoreboard support
fix: honor Retry-After on rate limits
docs: clarify partial response types
```

## Responsible endpoint access

Keep live test and development traffic low. Do not add scraping loops, authentication bypasses, or behavior intended to evade ESPN controls. Never commit cookies, tokens, or captured private data.

By contributing, you agree that your work is licensed under the repository's [MIT License](./LICENSE).
