# ESPN API Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> **⚠️ Development Status: Pre-Alpha**
> This project is in active early development. The API is not stable and breaking changes will occur frequently. Not recommended for production use yet. This does not yet have an existing npm package

An unofficial, type-safe TypeScript client for ESPN's various API endpoints. Built with performance, developer experience, and maintainability in mind.

## Project Vision

ESPN API Client aims to provide:

- **Type-safe access** to ESPN's sports data with full TypeScript support
- **Performant implementation** with minimal bundle size and efficient runtime
- **Developer-friendly API** with intuitive method names and excellent IDE support
- **Comprehensive coverage** of ESPN's major endpoints (News, Teams, Scoreboard, Athletes, etc.)
- **Robust error handling** with custom error types for common scenarios

## Why This Project?

ESPN provides rich sports data through various undocumented API endpoints, but accessing them directly requires:

- Manual URL construction and parameter handling
- No type safety or IDE autocomplete
- Custom error handling for each endpoint
- Repetitive boilerplate code

This client eliminates that friction while maintaining the flexibility to access ESPN's full data set.

## Planned Features

### Core Endpoints (MVP)

- [ ] **News API** - Get latest news for sports, teams, and players
- [ ] **Teams API** - Access team information, rosters, and statistics
- [ ] **Scoreboard API** - Retrieve game scores and schedules
- [ ] **Athletes API** - Query player data and statistics
- [ ] **Games API** - Detailed game information and play-by-play data

### Additional Features

- [ ] Intelligent caching layer (optional)
- [ ] Rate limiting protection
- [ ] Request retry logic
- [ ] Comprehensive documentation
- [ ] Usage examples for common scenarios

### Future Considerations

- Python client implementation
- Advanced query builders
- Pagination helpers
- WebSocket support for live data

## Quick Start (Planned API)

Once released, the API will look like this:

```typescript
import { ESPNClient } from 'espn-api-client';

// Initialize the client
const espn = new ESPNClient();

// Get latest NFL news
const news = await espn.news.getNFLNews({ limit: 10 });

// Get all NFL teams
const teams = await espn.teams.getAll();

// Get specific team by ID
const chiefs = await espn.teams.getById(12); // Kansas City Chiefs

// Get team roster
const roster = await espn.teams.getRoster(12);

// Get current scoreboard
const scoreboard = await espn.scoreboard.get({
  dates: '2025',
  seasonType: 2, // Regular season
  week: 1
});

// Get athlete information
const player = await espn.athletes.getById(3139477); // Patrick Mahomes
```

## Design Principles

This project follows strict development principles to ensure quality and maintainability:

### SOLID Principles

- Each endpoint class has a single, focused responsibility
- Extensible architecture without modifying core code
- Interchangeable implementations (caching, error handling)
- Focused interfaces without unnecessary methods

### Performance First

- **Minimal bundle size** - Tree-shakeable exports, no bloat
- **Lazy loading** - Endpoint classes instantiated only when used
- **Efficient parsing** - No unnecessary deep cloning or runtime validation
- **Smart defaults** - Sensible configuration out of the box

### Developer Experience

- Full TypeScript support with explicit return types
- Comprehensive JSDoc documentation
- Clear error messages with context
- Consistent API patterns across all endpoints

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

## Project Status

### Current Phase: Foundation (Phase 1)

**In Progress:**

- [ ] Project structure and tooling setup
- [ ] Core ESPNClient class implementation
- [ ] Custom error classes
- [ ] Base types and interfaces
- [ ] Initial documentation

**Next Up:**

- [ ] Core endpoint implementations (News, Teams, Scoreboard, Athletes)
- [ ] Comprehensive test suite
- [ ] Example usage documentation
- [ ] First alpha release

See [CLAUDE.md](./CLAUDE.md) for the complete implementation roadmap.

## Contributing

Contributions are welcome! This project is just getting started, so there are plenty of opportunities to make an impact.

Before contributing:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for workflow and standards
2. Review [CLAUDE.md](./CLAUDE.md) for development principles
3. Check existing issues or open a new one to discuss your idea

**Good First Contributions:**

- Implementing endpoint classes for specific sports
- Adding type definitions for API responses
- Writing tests for existing functionality
- Improving documentation and examples
- Reporting bugs or suggesting features

## Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/espn-api-client.git
cd espn-api-client

# Install dependencies
npm install

# Run tests (once available)
npm test

# Build the project (once available)
npm run build

# Run linter (once available)
npm run lint
```

## Documentation

- [Contributing Guide](./CONTRIBUTING.md) - How to contribute effectively
- [Development Guide](./CLAUDE.md) - Architecture, principles, and patterns
- API Documentation - Coming soon
- Examples - Coming soon

## Roadmap

### Phase 1: Foundation (Current)

Project setup, core client implementation, error handling

### Phase 2: Core Endpoints

News, Teams, Scoreboard, Athletes APIs with full test coverage

### Phase 3: Polish & Documentation

Comprehensive docs, examples, performance optimization

### Phase 4: Advanced Features

Caching, rate limiting, retry logic, pagination helpers

### Phase 5: Ecosystem

Python client, community examples, plugin system

See [CLAUDE.md](./CLAUDE.md) for detailed phase breakdown.

### Phase 6: Potential Enterprise Additions

GraphQL support, WebSocket connection, dynamic query builders, ORM-esque features

## Why TypeScript?

TypeScript provides several advantages for an API client:

- **Type safety** prevents runtime errors from invalid data access
- **IDE support** with autocomplete and inline documentation
- **Refactoring confidence** when evolving the API
- **Self-documenting code** through explicit types
- **Compile-time checks** catch bugs before runtime

The goal is sub-10KB bundle size for the core client with tree-shaking support, so you only bundle what you use.

## Important Notes

**Unofficial Project:**
This is an unofficial, community-maintained project and is not affiliated with, endorsed by, or sponsored by ESPN or The Walt Disney Company. ESPN's APIs are undocumented and may change without notice.

**No Guarantees:**
ESPN's API endpoints are not publicly documented or officially supported. They may:

- Change structure or format without warning
- Implement rate limiting or access restrictions
- Be deprecated or removed entirely

This client will do its best to handle changes gracefully, but breaking changes may be necessary to keep up with ESPN's API evolution.

**Use Responsibly:**
When using this client:

- Respect ESPN's servers - don't abuse the API with excessive requests
- Cache responses when practical to minimize load
- Be prepared for the API to be unavailable or rate-limited
- Don't use for commercial purposes without proper licensing

## License

[MIT](./LICENSE) - Copyright (c) 2025 Riel St. Amand

## Acknowledgments

- Thanks to all contributors who help build and maintain this project
- Inspired by the need for better developer tools in the sports data space
- Built with best practices from the TypeScript and open source communities

## Questions or Issues?

- **Bug reports**: [Open an issue](https://github.com/YOUR_USERNAME/espn-api-client/issues/new?template=bug_report.md)
- **Feature requests**: [Open an issue](https://github.com/YOUR_USERNAME/espn-api-client/issues/new?template=feature_request.md)
- **Questions**: [Start a discussion](https://github.com/YOUR_USERNAME/espn-api-client/discussions)

---

**Star this project** if you find it useful or want to follow its development!
