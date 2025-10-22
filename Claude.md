# Claude.md - ESPN API Client Development Guide

## Project Overview

Building unofficial ESPN API client libraries in both TypeScript and Python to provide type-safe, performant access to ESPN's sports data endpoints. This document guides development decisions to ensure high-quality, maintainable code.

## Core Principles

### SOLID Principles

#### Single Responsibility Principle (SRP)

- Each endpoint class handles only one domain (News, Teams, Athletes, etc.)
- Client class only handles HTTP communication and endpoint coordination
- Utility classes have focused purposes (caching, rate limiting, error handling)

#### Open/Closed Principle (OCP)

- Core client extensible without modification
- New endpoints added by creating new classes, not modifying existing ones
- Configuration options use interfaces/types that can be extended

#### Liskov Substitution Principle (LSP)

- All endpoint classes follow the same contract pattern
- Cache implementations are interchangeable (memory, filesystem, none)
- Error types maintain consistent interface

#### Interface Segregation Principle (ISP)

- Don't force clients to depend on methods they don't use
- Endpoint classes expose only relevant methods
- Configuration objects contain only applicable options

#### Dependency Inversion Principle (DIP)

- Depend on abstractions (interfaces/types), not concrete implementations
- HTTP client injectable for testing
- Cache strategy injectable and swappable

### DRY (Don't Repeat Yourself)

- Shared logic in base classes or utility functions
- URL building logic centralized
- Parameter validation reused across endpoints
- Type definitions shared, not duplicated
- Error handling patterns consistent across all endpoints

### YAGNI (You Aren't Gonna Need It)

**Build only what's needed NOW:**

- Start with core endpoints (News, Teams, Scoreboard, Athletes)
- Skip fantasy endpoints until explicitly requested
- No complex caching until proven necessary
- No retry logic until failures are observed

**Defer these until needed/later versions:**

❌ GraphQL support
❌ WebSocket connections
❌ Advanced query builders
❌ ORM-like features
❌ Automatic pagination (unless endpoint requires it)

### Performance Priorities

- Minimize Network Calls: Batch requests when possible, cache intelligently
- Lazy Loading: Load endpoint classes only when accessed
- Efficient Parsing: Parse only required fields, avoid deep cloning
- Memory Management: Don't hold large responses in memory unnecessarily
- Bundle Size (TypeScript): Tree-shakeable exports, minimal dependencies

## Architecture

### High-Level Structure

```text
ESPNClient (orchestrator)
├── HTTP Layer (axios/requests)
├── Endpoint Modules (News, Teams, Athletes, etc.)
│   └── Each returns typed responses
├── Utilities (errors, cache, rate limit)
└── Types (interfaces, enums, response types)
```

### Class Hierarchy

```text
ESPNClient (main entry point)
  ├── private http: AxiosInstance
  ├── get news(): NewsAPI
  ├── get teams(): TeamsAPI
  └── request<T>(): Promise<T>  // Core HTTP method

BaseEndpoint (optional, if shared logic emerges)
  └── constructor(client: ESPNClient)

NewsAPI extends BaseEndpoint
  └── getNFLNews(limit?: number): Promise<NewsResponse>

TeamsAPI extends BaseEndpoint
  └── getAllTeams(): Promise<TeamsResponse>
```

**Performance Note**: Use lazy initialization for endpoint classes to avoid instantiating unused endpoints.

```typescript
// GOOD - Lazy initialization
get news(): NewsAPI {
  if (!this._news) this._news = new NewsAPI(this);
  return this._news;
}

// BAD - Eager initialization
constructor() {
  this.news = new NewsAPI(this);  // Creates even if never used
}
```

## TypeScript Standards

### File Naming

- kebab-case.ts for files
- PascalCase for classes/interfaces/types
- camelCase for functions/variables

### Type Safety

- Always use explicit return types for public methods
- Avoid any - use unknown if type truly unknown
- Use strict: true in tsconfig
- Prefer interface over type for object shapes (better error messages)
- Use readonly for immutable properties

**Example**:

```typescript
// GOOD
async function getNFLNews(limit: number = 10): Promise<NewsResponse> {
  return this.client.request<NewsResponse>('site', '/path', { limit });
}

// BAD
async function getNFLNews(limit = 10) {  // Missing return type
  return this.client.request('site', '/path', { limit });  // Missing generic
}
```

### Performance Patterns

```typescript
// GOOD - Efficient object spread
const options = { ...defaults, ...userOptions };

// BAD - Deep clone (unnecessary unless nested mutation expected)
const options = JSON.parse(JSON.stringify(userOptions));

// GOOD - Lazy property access
get teams(): TeamsAPI {
  return this._teams ??= new TeamsAPI(this);
}

// GOOD - Destructure only what's needed
const { id, name } = largeObject;

// BAD - Clone entire large object
const copy = { ...largeObject };
```

### Error Handling

**Custom Error Hierarchy**:

```typescript
export class ESPNAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ESPNAPIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RateLimitError extends ESPNAPIError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends ESPNAPIError {
  constructor(endpoint: string) {
    super(`Resource not found: ${endpoint}`, 404, endpoint);
    this.name = 'NotFoundError';
  }
}
```

**Error Handling Pattern**:

```typescript
// In request method
async function request<T>(domain: Domain, path: string, params?: Params): Promise<T> {
  const url = `${this.baseUrls[domain]}${path}`;
  
  try {
    const response = await this.http.get<T>(url, { params });
    return response.data;
  } catch (error) {
    // Convert axios errors to our error types
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      if (status === 429) {
        throw new RateLimitError();
      }
      if (status === 404) {
        throw new NotFoundError(url);
      }
      
      throw new ESPNAPIError(
        error.message,
        status,
        url,
        error.response?.data
      );
    }
    
    // Unexpected error - re-throw
    throw error;
  }
}
```

**DRY Principle**: Error handling logic centralized in `request()` method, not repeated in every endpoint method.

### Type Definitions

**Response Typing Strategy**
**Progressive Enhancement**: Start with minimal types, expand based on actual usage.

```typescript
// GOOD - Start minimal
interface NewsResponse {
  articles: Array<{
    headline: string;
    description?: string;
    published: string;
  }>;
}

// AVOID initially - Over-typing before knowing what's needed
interface NewsResponse {
  header: {
    id: string;
    timestamp: number;
    version: string;
    // ... 20 more fields we might never use
  };
  articles: Array<{
    id: string;
    headline: string;
    description: string;
    // ... 50+ fields
  }>;
  metadata: {
    // ... etc
  };
}
```

**YAGNI**: Only type fields you actually use. Add more as needed.

### Naming Conventions

```typescript
typescript// Interfaces for API responses
interface NewsResponse { }
interface TeamResponse { }

// Interfaces for API entities
interface Article { }
interface Team { }
interface Player { }

// Options/Config interfaces
interface ClientOptions { }
interface RequestOptions { }

// Enums for constants
enum SeasonType {
  Preseason = 1,
  Regular = 2,
  Postseason = 3,
  Offseason = 4
}
```

## Performance Optimizations

### Lazy Endpoint Initialization

```typescript
// GOOD - Endpoints created only when accessed
class ESPNClient {
  private _news?: NewsAPI;
  
  get news(): NewsAPI {
    return this._news ??= new NewsAPI(this);
  }
}

// Usage: Only NewsAPI is instantiated
const news = await client.news.getNFLNews();
```

### Efficient Type Parsing

```typescript
// GOOD - No runtime overhead, compile-time only
interface Team {
  id: string;
  name: string;
}

const team: Team = response.data;  // Just type assertion

// AVOID - Runtime validation unless truly needed
import { z } from 'zod';
const TeamSchema = z.object({
  id: z.string(),
  name: z.string()
});
const team = TeamSchema.parse(response.data);  // Runtime cost
```

**Use runtime validation (Zod, Pydantic) only when**:

- Validating user input
- Critical data integrity checks
- Converting external data formats

**Don't use runtime validation for**:

ESPN API responses (trust the source)
Internal type conversions
Performance-critical paths

### Request Batching Pattern

```typescript
class RequestBatcher {
  private queue: Array<{
    url: string;
    resolve: (data: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  private timeout?: NodeJS.Timeout;
  
  add<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      
      if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), 10);
      }
    });
  }
  
  private async flush() {
    const batch = this.queue.splice(0, 10);  // ESPN may limit batch size
    // Execute batch...
  }
}
```

### Bundle Size Optimization (TypeScript)

```typescript
// GOOD - Tree-shakeable exports
export { ESPNClient } from './client';
export { NewsAPI } from './endpoints/news';
export { TeamsAPI } from './endpoints/teams';
export type * from './types';

// AVOID - Barrel exports that prevent tree-shaking
export * from './endpoints';  // Imports everything
```

**tsup configuration for optimal bundles**:

```javascript
// tsup.config.ts
export default {
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,  // Code splitting for better tree-shaking
  treeshake: true,
  clean: true,
  minify: false,    // Let consumers minify
};
```

## Testing Strategy

### Test Structure

```typescript
// tests/endpoints/news.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ESPNClient } from '../../src';

const server = setupServer();

describe('NewsAPI', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  it('fetches NFL news', async () => {
    server.use(
      http.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news', () => {
        return HttpResponse.json({
          articles: [
            { headline: 'Test Article', published: '2025-01-01' }
          ]
        });
      })
    );
    
    const client = new ESPNClient();
    const response = await client.news.getNFLNews(1);
    
    expect(response.articles).toHaveLength(1);
    expect(response.articles[0].headline).toBe('Test Article');
  });
  
  it('handles errors gracefully', async () => {
    server.use(
      http.get('https://site.api.espn.com/apis/site/v2/sports/football/nfl/news', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    
    const client = new ESPNClient();
    await expect(client.news.getNFLNews()).rejects.toThrow();
  });
});
```

### Test Priorities

1. Unit Tests: Core logic, error handling, type conversions
2. Integration Tests: Real API calls (sparingly, in CI only)
3. Type Tests: Verify type inference works correctly

### Performance Testing

```typescript
// tests/performance.test.ts
import { describe, it, expect } from 'vitest';
import { ESPNClient } from '../src';

describe('Performance', () => {
  it('lazy loads endpoints efficiently', () => {
    const client = new ESPNClient();
    
    // Should not instantiate any endpoints yet
    expect((client as any)._news).toBeUndefined();
    expect((client as any)._teams).toBeUndefined();
    
    // Access news endpoint
    const newsAPI = client.news;
    
    // Now news should be instantiated, but not teams
    expect((client as any)._news).toBeDefined();
    expect((client as any)._teams).toBeUndefined();
  });
  
  it.skip('handles 100 concurrent requests', async () => {
    // Only run in performance test suite
    const client = new ESPNClient();
    const requests = Array.from({ length: 100 }, () =>
      client.news.getNFLNews(1)
    );
    
    const start = performance.now();
    await Promise.all(requests);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(5000);  // Should complete in 5s
  }, 10000);
});
```

## Common Patterns

### Endpoint Class Pattern

```typescript
// src/endpoints/teams.ts
import type { ESPNClient } from '../client';
import type { Team, TeamRoster } from '../types';

export class TeamsAPI {
  constructor(private readonly client: ESPNClient) {}
  
  async getAll(): Promise<Team[]> {
    const response = await this.client.request<{ teams: Team[] }>(
      'site',
      '/apis/site/v2/sports/football/nfl/teams'
    );
    return response.teams;
  }
  
  async getById(id: number): Promise<Team> {
    return this.client.request<Team>(
      'site',
      `/apis/site/v2/sports/football/nfl/teams/${id}`
    );
  }
  
  async getRoster(id: number): Promise<TeamRoster> {
    return this.client.request<TeamRoster>(
      'site',
      `/apis/site/v2/sports/football/nfl/teams/${id}/roster`
    );
  }
}
```

**Key Points**:

- Single responsibility: Only handles team-related endpoints
- Readonly client reference (prevent mutation)
- Specific return types
- Simple method names (get, getAll, getRoster)

### Parameter Building Pattern

```typescript
// GOOD - Type-safe parameter building
interface ScoreboardParams {
  dates?: string;
  seasonType?: number;
  week?: number;
  limit?: number;
}

const getScoreboard = async (params?: ScoreboardParams): Promise<ScoreboardResponse> => {
    return this.client.request('site', '/apis/site/v2/sports/football/nfl/scoreboard', params);
}


// Usage
const scoreboard = await client.scoreboard.get({
  dates: '2025',
  seasonType: 2,
  week: 1
});
```

### Response Transformation Pattern

ESPN's unofficial APIs return large JSON objects often full of metadata that is often unneeded for the given function call. Transformation will likely be needed.

**Warning**: Only transform if it significantly improves DX. Prefer returning raw responses.

## Anti-Patterns to Avoid

❌ **Don't**: Over-Abstract Too Early

```typescript
// BAD - Premature abstraction
abstract class BaseEndpoint<T> {
  abstract getAll(): Promise<T[]>;
  abstract getById(id: number): Promise<T>;
  abstract create(data: T): Promise<T>;
  abstract update(id: number, data: T): Promise<T>;
}

class TeamsAPI extends BaseEndpoint<Team> {
  // Forced to implement methods we don't need
  create() { throw new Error('Not supported'); }
  update() { throw new Error('Not supported'); }
}
```

**Instead**: Add abstraction only when you have 3+ classes with identical patterns.

❌ **Don't**: Deep Nesting

```typescript
// BAD
const teamName = response.data.sports[0].leagues[0].teams[0].team.displayName;

// GOOD - Destructure or add helper
const { sports: [{ leagues: [{ teams }] }] } = response.data;
const teamName = teams[0].team.displayName;

// OR create a transformer if used frequently
function extractTeams(response: RawResponse): Team[] {
  return response.data.sports[0].leagues[0].teams;
}
```

❌ **Don't**: Ignore TypeScript Errors

```typescript
// BAD
// @ts-ignore
const data = riskyOperation();

// GOOD - Handle properly
const data = riskyOperation() as ExpectedType;
// OR
if (isExpectedType(data)) {
  // Use data
}
```

❌ **Don't**: Mutate Parameters

```typescript
// BAD
function addDefaults(options: Options): Options {
  options.timeout = options.timeout || 10000;  // Mutates input
  return options;
}

// GOOD
function addDefaults(options: Options): Options {
  return {
    timeout: 10000,
    ...options
  };
}
```

❌ **Don't**: Silent Failures

```typescript
// BAD
async function getTeam(id: number): Promise<Team | null> {
  try {
    return await this.client.request('site', `/teams/${id}`);
  } catch {
    return null;  // Swallows error - caller doesn't know what happened
  }
}

// GOOD
async function getTeam(id: number): Promise<Team> {
  return this.client.request('site', `/teams/${id}`);
  // Let error bubble up - caller can handle
}
```

## File Organization

```text
src/
├── index.ts                 # Main exports
├── client.ts                # ESPNClient class
├── endpoints/
│   ├── index.ts            # Endpoint exports
│   ├── news.ts             # NewsAPI class
│   ├── teams.ts            # TeamsAPI class
│   ├── athletes.ts         # AthletesAPI class
│   ├── scoreboard.ts       # ScoreboardAPI class
│   └── games.ts            # GamesAPI class
├── types/
│   ├── index.ts            # Type exports
│   ├── client.ts           # Client-related types
│   ├── responses.ts        # API response types
│   └── common.ts           # Shared types
├── utils/
│   ├── errors.ts           # Error classes
│   ├── cache.ts            # Cache implementation (if needed)
│   └── constants.ts        # Constants (base URLs, etc.)
└── __tests__/              # Co-located tests (alternative structure)

tests/                       # Or separate tests directory
├── unit/
│   ├── client.test.ts
│   └── endpoints/
│       ├── news.test.ts
│       └── teams.test.ts
├── integration/
│   └── real-api.test.ts    # Actual API calls (run sparingly)
└── performance/
    └── benchmarks.test.ts
```

## Implementation Checklist

### Phase 1: Foundation

- [ ] Setup project structure
- [ ] Configure TypeScript/Python tooling
- [ ] Implement core ESPNClient class
- [ ] Implement request() method with error handling
- [ ] Create custom error classes
- [ ] Add basic types for client options

### Phase 2: Core Endpoints (MVP)

- [ ] NewsAPI - getNFLNews, getTeamNews
- [ ] TeamsAPI - getAll, getById, getRoster
- [ ] ScoreboardAPI - get (with date filtering)
- [ ] AthletesAPI - getById, search (if available)

### Phase 3: Testing & Documentation

- [ ] Unit tests for all endpoints
- [ ] Integration tests (limited)
- [ ] README with examples
- [ ] API documentation
- [ ] TypeDoc/Sphinx setup

### Phase 4: Polish

- [ ] Add JSDoc/docstrings to all public methods
- [ ] Performance testing
- [ ] Bundle size optimization (TS)
- [ ] Add more comprehensive types
- [ ] Examples directory

### Phase 5: Advanced Features

- [ ] Caching layer
- [ ] Rate limiting
- [ ] Retry logic
- [ ] Request batching
- [ ] Pagination helpers

### Phase 6: Enterprise Additions (potential)

- [ ] GraphQL support
- [ ] WebSocket connections
- [ ] Advanced query builders
- [ ] ORM-like features
- [ ] Automatic pagination (unless endpoint requires it)

## Deployment Checklist

### Pre-Release

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle builds successfully
- [ ] README complete
- [ ] CHANGELOG updated
- [ ] Version bumped in package.json

### Release

- [ ] Tag version in git
- [ ] Publish to npm/PyPI
- [ ] Create GitHub release
- [ ] Update documentation site (if exists)

### Post-Release

- [ ] Monitor for issues
- [ ] Respond to bug reports within 48hrs
- [ ] Plan next version features

## Performance Benchmarks (Goals)

- Bundle size (minified + gzipped): < 10KB for core client
- Tree-shaken single endpoint: < 5KB
- Cold start time: < 10ms
- Request overhead: < 5ms per request
- Time to first API response: < 500ms (network dependent)
- Support for 100+ concurrent requests without memory issues

## Questions to Ask When Adding Features

1. Does this follow SOLID? Is responsibility clear and single?
2. Are we repeating ourselves? Could this be shared?
3. Do we actually need this? Or are we gold-plating?
4. What's the performance impact? Memory? Bundle size? CPU?
5. Can users opt-out? Is this feature tree-shakeable/optional?
6. Is this tested? Can we verify it works?
7. Is this documented? Can users understand how to use it?

## Final Notes

**Remember**:

- Start simple, add complexity only when proven necessary
- Performance matters, but correctness matters more
- Users want reliability over features
- ESPN's API is unofficial - it may change anytime
- Good error messages save hours of debugging

**When in doubt**:

- Prioritize clarity over cleverness
- Choose explicitness over magic
- Prefer composition over inheritance
- Test the happy path AND error cases
- Document why, not just what

This guide should evolve as the project matures. Update it when patterns emerge or anti-patterns are discovered.
