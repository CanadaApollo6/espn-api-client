# Contributing to ESPN API Client

Thank you for your interest in contributing to the ESPN API Client project. This document provides guidelines and instructions for contributing effectively.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Submitting Changes](#submitting-changes)
- [Issue Reporting](#issue-reporting)
- [Project Principles](#project-principles)

## Code of Conduct

This project follows standard open source community guidelines:

- Be respectful and constructive in all interactions
- Focus on technical merit and project goals
- Accept feedback gracefully and provide feedback professionally
- Prioritize the project's long-term maintainability

## Getting Started

### Prerequisites

- Node.js 24+ and npm/yarn/pnpm
- Git
- TypeScript knowledge
- Understanding of REST APIs

### Initial Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/espn-api-client.git
   cd espn-api-client
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `perf/` - Performance improvements

Examples: `feature/add-standings-endpoint`, `fix/rate-limit-handling`, `docs/update-readme`

### Making Changes

1. **Read [CLAUDE.md](./CLAUDE.md)** - Understand project principles (SOLID, DRY, YAGNI)
2. **Write tests first** - Follow TDD when practical
3. **Keep changes focused** - One feature/fix per PR
4. **Maintain performance** - Consider bundle size and runtime efficiency
5. **Update documentation** - Add JSDoc comments and update README if needed

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building

```bash
# Build the project
npm run build

# Type-check without building
npm run type-check
```

### Linting

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Coding Standards

### TypeScript Style Guide

Follow the guidelines in [CLAUDE.md](./CLAUDE.md). Key points:

**File Naming:**

- Use `kebab-case.ts` for files
- Use `PascalCase` for classes/interfaces/types
- Use `camelCase` for functions/variables

**Type Safety:**

- Always use explicit return types for public methods
- Avoid `any` - use `unknown` if type is truly unknown
- Use `readonly` for immutable properties
- Prefer `interface` over `type` for object shapes

**Code Organization:**

```typescript
// GOOD - Clear, focused endpoint class
export class TeamsAPI {
  constructor(private readonly client: ESPNClient) {}

  async getAll(): Promise<Team[]> {
    return this.client.request<Team[]>('site', '/teams');
  }
}
```

**Error Handling:**

- Use custom error classes extending `ESPNAPIError`
- Centralize error handling in the `request()` method
- Let errors bubble up - don't swallow them

**Performance:**

- Use lazy initialization for endpoint classes
- Avoid unnecessary deep cloning
- Prefer destructuring over copying entire objects
- Keep bundle size minimal

### Example of Good Code

```typescript
// src/endpoints/standings.ts
import type { ESPNClient } from '../client';
import type { StandingsResponse, StandingsParams } from '../types';

export class StandingsAPI {
  constructor(private readonly client: ESPNClient) {}

  /**
   * Get current standings for a league
   * @param params - Optional parameters to filter standings
   * @returns Promise resolving to standings data
   */
  async get(params?: StandingsParams): Promise<StandingsResponse> {
    return this.client.request<StandingsResponse>(
      'site',
      '/apis/site/v2/sports/football/nfl/standings',
      params
    );
  }
}
```

## Testing Requirements

### Test Coverage

All new features must include tests:

- **Unit tests** - Test individual functions/methods
- **Integration tests** - Test endpoint interactions (use MSW for mocking)
- **Type tests** - Verify type inference works correctly

### Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ESPNClient } from '../../src';

const server = setupServer();

describe('StandingsAPI', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('fetches standings successfully', async () => {
    server.use(
      http.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings', () => {
        return HttpResponse.json({
          standings: [{ team: 'Team A', wins: 10, losses: 5 }]
        });
      })
    );

    const client = new ESPNClient();
    const standings = await client.standings.get();

    expect(standings.standings).toHaveLength(1);
  });

  it('handles API errors', async () => {
    server.use(
      http.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const client = new ESPNClient();
    await expect(client.standings.get()).rejects.toThrow();
  });
});
```

### Performance Tests

For performance-critical changes, include benchmark tests:

```typescript
it('handles 100 concurrent requests efficiently', async () => {
  const client = new ESPNClient();
  const requests = Array.from({ length: 100 }, () => client.teams.getAll());

  const start = performance.now();
  await Promise.all(requests);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(5000);
}, 10000);
```

## Submitting Changes

### Pull Request Process

1. **Update your branch:**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all checks pass:**

   - Tests pass (`npm test`)
   - No TypeScript errors (`npm run type-check`)
   - No linting errors (`npm run lint`)
   - Build succeeds (`npm run build`)

3. **Commit with clear messages:**

   ```bash
   git commit -m "feat: add standings endpoint for NFL"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/modifications
   - `perf:` - Performance improvements
   - `chore:` - Maintenance tasks

4. **Push and create PR:**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Write a clear PR description:**

   ```markdown
   ## Summary
   Brief description of what this PR does

   ## Changes
   - Added StandingsAPI endpoint
   - Created types for standings responses
   - Added comprehensive unit tests

   ## Testing
   - [ ] All existing tests pass
   - [ ] New tests added and passing
   - [ ] Manually tested against live API

   ## Related Issues
   Closes #123
   ```

### PR Review Criteria

Your PR will be evaluated on:

- **Code quality** - Follows project standards and principles
- **Test coverage** - Adequate tests with good coverage
- **Documentation** - JSDoc comments and README updates
- **Performance** - No negative impact on bundle size or runtime
- **Breaking changes** - Clearly documented if applicable

### After Submission

- Respond to review feedback promptly
- Make requested changes in new commits (don't force-push until approved)
- Keep discussion focused and professional
- Be patient - maintainers review in their available time

## Issue Reporting

### Before Creating an Issue

1. **Search existing issues** - Your issue may already exist
2. **Check documentation** - Ensure it's not a usage question
3. **Verify with latest version** - Update and test first

### Bug Reports

Use the bug report template and include:

- **Description** - Clear explanation of the bug
- **Reproduction steps** - Minimal code to reproduce
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - OS, Node version, package version
- **Error messages** - Full stack traces if applicable

### Feature Requests

Include:

- **Use case** - Why this feature is needed
- **Proposed solution** - How it should work
- **Alternatives considered** - Other approaches
- **Implementation notes** - Technical details if relevant

**Note:** Features should align with project principles. Avoid requesting:

- GraphQL support (deferred)
- WebSocket connections (deferred)
- Advanced query builders (deferred)
- Features that significantly increase bundle size

## Project Principles

This project follows specific development principles outlined in [CLAUDE.md](./CLAUDE.md):

### SOLID Principles

- **Single Responsibility** - Each class has one clear purpose
- **Open/Closed** - Extend without modifying existing code
- **Liskov Substitution** - Implementations are interchangeable
- **Interface Segregation** - Focused interfaces, not bloated ones
- **Dependency Inversion** - Depend on abstractions

### DRY (Don't Repeat Yourself)

- Centralize shared logic
- Reuse types and utilities
- Avoid code duplication

### YAGNI (You Aren't Gonna Need It)

- Build only what's needed now
- Don't add speculative features
- Keep implementation simple
- Defer complex features until proven necessary

### Performance First

- Minimize bundle size
- Use lazy initialization
- Avoid unnecessary runtime overhead
- Optimize for tree-shaking

### Examples of Aligned Contributions

**Good:**

- Adding a new endpoint (News, Teams, Standings)
- Improving type definitions
- Fixing bugs or error handling
- Adding tests
- Performance optimizations
- Documentation improvements

**Needs Discussion:**

- Adding new dependencies
- Changing core architecture
- Breaking changes to public API
- Features that increase bundle size significantly

## Questions?

- Check [CLAUDE.md](./CLAUDE.md) for development guidelines
- Search existing issues and discussions
- Open a discussion for general questions
- Contact maintainers for security issues

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](./LICENSE) file).

---

Thank you for contributing to ESPN API Client. Your efforts help make this project better for everyone.
