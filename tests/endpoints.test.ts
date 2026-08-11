import ky from 'ky';
import { describe, expect, it } from 'vitest';

import { ESPNClient, InvalidResponseError } from '../src/index';

const SPORT = 'college football';
const LEAGUE = 'sec/west';
const SITE_PREFIX = '/apis/site/v2/sports/college%20football/sec%2Fwest';
const SITE_V2_PREFIX = '/apis/v2/sports/college%20football/sec%2Fwest';
const WEB_PREFIX = '/apis/common/v3/sports/college%20football/sec%2Fwest';
const CORE_PREFIX = '/v2/sports/college%20football/leagues/sec%2Fwest';

interface ClientHarness {
  readonly client: ESPNClient;
  readonly requests: Request[];
}

function createClientHarness(...responses: readonly unknown[]): ClientHarness {
  const requests: Request[] = [];
  let responseIndex = 0;

  const httpClient = ky.create({
    fetch: (input, init) => {
      requests.push(new Request(input, init));

      if (responseIndex >= responses.length) {
        throw new Error('The test fake received more requests than configured responses.');
      }

      const response = responses[responseIndex];
      responseIndex += 1;
      return Promise.resolve(Response.json(response));
    },
  });

  return {
    client: new ESPNClient({
      sport: SPORT,
      league: LEAGUE,
      maxRetries: 0,
      httpClient,
      baseUrls: {
        site: 'https://site.test',
        web: 'https://web.test',
        core: 'https://core.test',
      },
    }),
    requests,
  };
}

function requestUrl(requests: readonly Request[], index: number): URL {
  const request = requests[index];
  if (request === undefined) {
    throw new Error(`Expected request ${String(index + 1)} to have been captured.`);
  }
  return new URL(request.url);
}

function expectOriginAndPath(url: URL, origin: string, pathname: string): void {
  expect(url.origin).toBe(origin);
  expect(url.pathname).toBe(pathname);
}

describe('NewsAPI', () => {
  it('maps league, filter, and encoded identifier requests', async () => {
    const newsResponse = {
      articles: [{ id: 'article-1', headline: 'Draft update' }],
    };
    const { client, requests } = createClientHarness(newsResponse, newsResponse, newsResponse);

    await expect(
      client.news.get({
        limit: 12,
        lang: 'en',
        region: 'us',
        topic: ['draft', 'injuries'],
      }),
    ).resolves.toEqual(newsResponse);
    await client.news.getForTeam('team / 7', { limit: 2 });
    await client.news.getForAthlete(404_0715, { region: 'ca' });

    const leagueNews = requestUrl(requests, 0);
    expectOriginAndPath(leagueNews, 'https://site.test', `${SITE_PREFIX}/news`);
    expect(leagueNews.searchParams.get('limit')).toBe('12');
    expect(leagueNews.searchParams.get('lang')).toBe('en');
    expect(leagueNews.searchParams.get('region')).toBe('us');
    expect(leagueNews.searchParams.getAll('topic')).toEqual(['draft', 'injuries']);

    const teamNews = requestUrl(requests, 1);
    expectOriginAndPath(teamNews, 'https://site.test', `${SITE_PREFIX}/news`);
    expect(teamNews.searchParams.get('team')).toBe('team / 7');
    expect(teamNews.searchParams.get('limit')).toBe('2');

    const athleteNews = requestUrl(requests, 2);
    expectOriginAndPath(athleteNews, 'https://site.test', `${SITE_PREFIX}/news`);
    expect(athleteNews.searchParams.get('athlete')).toBe('4040715');
    expect(athleteNews.searchParams.get('region')).toBe('ca');
  });
});

describe('TeamsAPI', () => {
  it('maps list, detail, roster, schedule, and statistics requests', async () => {
    const teamsResponse = {
      sports: [
        {
          id: '20',
          name: 'Football',
          leagues: [
            {
              id: '28',
              name: 'Test League',
              teams: [{ team: { id: '12', displayName: 'Test Team' } }],
            },
          ],
        },
      ],
    };
    const teamResponse = { team: { id: '12', displayName: 'Test Team' } };
    const rosterResponse = {
      athletes: [
        {
          position: 'offense',
          items: [{ id: '1', displayName: 'Test Player' }],
        },
      ],
      team: { id: '12', displayName: 'Test Team' },
    };
    const scheduleResponse = {
      events: [],
      team: { id: '12', displayName: 'Test Team' },
      requestedSeason: { year: 2026 },
    };
    const statisticsResponse = {
      team: { id: '12', displayName: 'Test Team' },
      results: {},
    };
    const { client, requests } = createClientHarness(
      teamsResponse,
      teamResponse,
      rosterResponse,
      scheduleResponse,
      statisticsResponse,
    );

    await expect(client.teams.getAll({ limit: 50, region: 'us' })).resolves.toEqual(teamsResponse);
    await expect(
      client.teams.getById('team / 12', { season: 2025, seasonType: 2, lang: 'en' }),
    ).resolves.toEqual(teamResponse);
    await expect(client.teams.getRoster(12, { season: 2026, seasonType: 1 })).resolves.toEqual(
      rosterResponse,
    );
    await expect(
      client.teams.getSchedule('schedule team', { season: 2024, seasonType: 3 }),
    ).resolves.toEqual(scheduleResponse);
    await expect(
      client.teams.getStatistics('stats/team', { season: 2023, seasonType: 4 }),
    ).resolves.toEqual(statisticsResponse);

    const list = requestUrl(requests, 0);
    expectOriginAndPath(list, 'https://site.test', `${SITE_PREFIX}/teams`);
    expect(Object.fromEntries(list.searchParams)).toEqual({ limit: '50', region: 'us' });

    const detail = requestUrl(requests, 1);
    expectOriginAndPath(detail, 'https://site.test', `${SITE_PREFIX}/teams/team%20%2F%2012`);
    expect(Object.fromEntries(detail.searchParams)).toEqual({
      season: '2025',
      lang: 'en',
      seasontype: '2',
    });
    expect(detail.searchParams.has('seasonType')).toBe(false);

    const roster = requestUrl(requests, 2);
    expectOriginAndPath(roster, 'https://site.test', `${SITE_PREFIX}/teams/12/roster`);
    expect(Object.fromEntries(roster.searchParams)).toEqual({
      season: '2026',
      seasontype: '1',
    });

    const schedule = requestUrl(requests, 3);
    expectOriginAndPath(
      schedule,
      'https://site.test',
      `${SITE_PREFIX}/teams/schedule%20team/schedule`,
    );
    expect(Object.fromEntries(schedule.searchParams)).toEqual({
      season: '2024',
      seasontype: '3',
    });

    const statistics = requestUrl(requests, 4);
    expectOriginAndPath(
      statistics,
      'https://site.test',
      `${SITE_PREFIX}/teams/stats%2Fteam/statistics`,
    );
    expect(Object.fromEntries(statistics.searchParams)).toEqual({
      season: '2023',
      seasontype: '4',
    });
  });
});

describe('ScoreboardAPI', () => {
  it('maps schedule filters and validates the representative event shape', async () => {
    const response = {
      leagues: [{ id: 'league-1', name: 'Test League' }],
      events: [
        {
          id: 'event-1',
          name: 'Away at Home',
          competitions: [
            {
              id: 'competition-1',
              competitors: [
                {
                  id: '12',
                  homeAway: 'home',
                  team: { id: '12', displayName: 'Test Team' },
                },
              ],
            },
          ],
        },
      ],
    };
    const { client, requests } = createClientHarness(response);

    await expect(
      client.scoreboard.get({
        dates: '20260910-20260914',
        seasonType: 2,
        week: 1,
        limit: 100,
        groups: '80/1',
      }),
    ).resolves.toEqual(response);

    const url = requestUrl(requests, 0);
    expectOriginAndPath(url, 'https://site.test', `${SITE_PREFIX}/scoreboard`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      dates: '20260910-20260914',
      week: '1',
      limit: '100',
      groups: '80/1',
      seasontype: '2',
    });
    expect(url.searchParams.has('seasonType')).toBe(false);
  });
});

describe('AthletesAPI', () => {
  it('maps profile, stats, and game-log paths to the web API', async () => {
    const profileResponse = { athlete: { id: '4040715', displayName: 'Test Player' } };
    const statsResponse = { categories: [], filters: [], glossary: [], teams: {} };
    const gameLogResponse = { categories: [], seasonTypes: [], events: {} };
    const { client, requests } = createClientHarness(
      profileResponse,
      statsResponse,
      gameLogResponse,
    );

    await expect(
      client.athletes.getById('player / 1', { lang: 'en', region: 'us' }),
    ).resolves.toEqual(profileResponse);
    await expect(client.athletes.getStats(404_0715, { region: 'ca' })).resolves.toEqual(
      statsResponse,
    );
    await expect(
      client.athletes.getGameLog('player two', { season: 2026, lang: 'fr' }),
    ).resolves.toEqual(gameLogResponse);

    const profile = requestUrl(requests, 0);
    expectOriginAndPath(profile, 'https://web.test', `${WEB_PREFIX}/athletes/player%20%2F%201`);
    expect(Object.fromEntries(profile.searchParams)).toEqual({ lang: 'en', region: 'us' });

    const stats = requestUrl(requests, 1);
    expectOriginAndPath(stats, 'https://web.test', `${WEB_PREFIX}/athletes/4040715/stats`);
    expect(Object.fromEntries(stats.searchParams)).toEqual({ region: 'ca' });

    const gameLog = requestUrl(requests, 2);
    expectOriginAndPath(gameLog, 'https://web.test', `${WEB_PREFIX}/athletes/player%20two/gamelog`);
    expect(Object.fromEntries(gameLog.searchParams)).toEqual({ season: '2026', lang: 'fr' });
  });
});

describe('GamesAPI', () => {
  it('maps summary and core event requests to their distinct API origins', async () => {
    const summaryResponse = { header: { id: 'event-1' } };
    const coreResponse = { id: 'event-2', name: 'Away at Home' };
    const { client, requests } = createClientHarness(summaryResponse, coreResponse);

    await expect(
      client.games.getSummary('event / 1', { lang: 'en', region: 'us' }),
    ).resolves.toEqual(summaryResponse);
    await expect(client.games.getById('event two', { lang: 'fr' })).resolves.toEqual(coreResponse);

    const summary = requestUrl(requests, 0);
    expectOriginAndPath(summary, 'https://site.test', `${SITE_PREFIX}/summary`);
    expect(Object.fromEntries(summary.searchParams)).toEqual({
      lang: 'en',
      region: 'us',
      event: 'event / 1',
    });

    const core = requestUrl(requests, 1);
    expectOriginAndPath(core, 'https://core.test', `${CORE_PREFIX}/events/event%20two`);
    expect(Object.fromEntries(core.searchParams)).toEqual({ lang: 'fr' });
  });
});

describe('StandingsAPI', () => {
  it('maps hierarchy and season filters to the site v2 route', async () => {
    const response = {
      id: 'league-1',
      name: 'Test League',
      children: [
        {
          id: 'conference-1',
          name: 'Test Conference',
          standings: {
            entries: [
              {
                team: { id: '12', displayName: 'Test Team' },
                stats: [{ name: 'wins', value: 12 }],
              },
            ],
          },
          children: [{ id: 'division-1', name: 'Test Division' }],
        },
      ],
      seasons: [{ year: 2026, displayName: '2026' }],
    };
    const { client, requests } = createClientHarness(response);

    await expect(
      client.standings.get({
        season: 2026,
        seasonType: 2,
        type: 3,
        level: 2,
        lang: 'en',
        region: 'us',
      }),
    ).resolves.toEqual(response);

    const url = requestUrl(requests, 0);
    expectOriginAndPath(url, 'https://site.test', `${SITE_V2_PREFIX}/standings`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      season: '2026',
      type: '3',
      level: '2',
      lang: 'en',
      region: 'us',
      seasontype: '2',
    });
    expect(url.searchParams.has('seasonType')).toBe(false);
  });
});

interface InvalidResponseCase {
  readonly name: string;
  readonly response: unknown;
  readonly invoke: (client: ESPNClient) => Promise<unknown>;
}

const invalidResponseCases: readonly InvalidResponseCase[] = [
  {
    name: 'news article',
    response: { articles: [{ id: 'article-1' }] },
    invoke: async (client) => client.news.get(),
  },
  {
    name: 'team list',
    response: { sports: [{}] },
    invoke: async (client) => client.teams.getAll(),
  },
  {
    name: 'team detail',
    response: { team: { id: '12' } },
    invoke: async (client) => client.teams.getById(12),
  },
  {
    name: 'team roster',
    response: { athletes: [], team: [] },
    invoke: async (client) => client.teams.getRoster(12),
  },
  {
    name: 'team schedule',
    response: { events: [], team: {}, requestedSeason: null },
    invoke: async (client) => client.teams.getSchedule(12),
  },
  {
    name: 'team statistics',
    response: { team: {} },
    invoke: async (client) => client.teams.getStatistics(12),
  },
  {
    name: 'scoreboard event',
    response: { leagues: [], events: [{ id: 'event-1' }] },
    invoke: async (client) => client.scoreboard.get(),
  },
  {
    name: 'scoreboard competition',
    response: {
      leagues: [],
      events: [
        {
          id: 'event-1',
          name: 'Away at Home',
          competitions: [{ id: 'competition-1', competitors: [{}] }],
        },
      ],
    },
    invoke: async (client) => client.scoreboard.get(),
  },
  {
    name: 'athlete profile',
    response: { athlete: { id: 'player-1' } },
    invoke: async (client) => client.athletes.getById('player-1'),
  },
  {
    name: 'athlete stats',
    response: { categories: [], filters: [], glossary: [], teams: [] },
    invoke: async (client) => client.athletes.getStats('player-1'),
  },
  {
    name: 'athlete game log',
    response: { categories: [], seasonTypes: [], events: [] },
    invoke: async (client) => client.athletes.getGameLog('player-1'),
  },
  {
    name: 'game summary',
    response: { header: [] },
    invoke: async (client) => client.games.getSummary('event-1'),
  },
  {
    name: 'core event',
    response: { id: 'event-1' },
    invoke: async (client) => client.games.getById('event-1'),
  },
  {
    name: 'standings root',
    response: { id: 'league-1', name: 'Test League', children: [], seasons: {} },
    invoke: async (client) => client.standings.get(),
  },
  {
    name: 'standings entry',
    response: {
      id: 'league-1',
      name: 'Test League',
      children: [
        {
          id: 'conference-1',
          name: 'Test Conference',
          standings: { entries: [{ team: {}, stats: [] }] },
        },
      ],
      seasons: [],
    },
    invoke: async (client) => client.standings.get(),
  },
];

describe('endpoint response guards', () => {
  it.each(invalidResponseCases)(
    'rejects an invalid $name response',
    async ({ response, invoke }) => {
      const { client } = createClientHarness(response);

      await expect(invoke(client)).rejects.toBeInstanceOf(InvalidResponseError);
      await expect(invoke(createClientHarness(response).client)).rejects.toMatchObject({
        code: 'INVALID_RESPONSE',
      });
    },
  );
});
