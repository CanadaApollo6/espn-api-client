# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- TypeScript client scoped to configurable ESPN sport and league slugs, defaulting to `football` and `nfl`.
- Scoreboard, standings, teams, news, athletes, and games endpoint groups.
- Raw GET requests across ESPN's site, web, and core API origins.
- Ky-based total timeouts, bounded retries, jittered backoff, and `Retry-After` support.
- Typed ESPN-specific errors for HTTP, rate-limit, network, timeout, abort, and invalid-response failures.
- Partial readonly ESPN response types with lightweight runtime envelope guards.
- ESM and TypeScript declaration builds, plus installed-package consumer validation.
- Deterministic tests, opt-in live endpoint smoke tests, package validation, and Node.js 22/24 CI.
- Biome formatting, linting, and import organization with TypeScript 7 typechecks.

### Notes

- This is an unofficial client and is not affiliated with ESPN or The Walt Disney Company.
- The package has not yet been published to npm.
