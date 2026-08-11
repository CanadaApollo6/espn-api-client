import { describe, expect, it } from 'vitest';

import { ESPNClient } from '../../src';

const describeLive = process.env.ESPN_LIVE_TESTS === '1' ? describe : describe.skip;

describeLive('ESPN live API smoke tests', () => {
  const client = new ESPNClient({ maxRetries: 0, timeoutMs: 20_000 });

  it('loads a historical scoreboard', async () => {
    const response = await client.scoreboard.get({ dates: '20250907', limit: 1 });
    expect(response.events[0]?.id).toBeTypeOf('string');
  });

  it('loads a team and league news', async () => {
    const [team, news] = await Promise.all([
      client.teams.getById(12),
      client.news.get({ limit: 1 }),
    ]);
    expect(team.team.id).toBe('12');
    expect(news.articles.length).toBeGreaterThan(0);
  });

  it('loads team collections and team resources', async () => {
    const [teams, roster, schedule, statistics] = await Promise.all([
      client.teams.getAll({ limit: 32 }),
      client.teams.getRoster(12, { season: 2025 }),
      client.teams.getSchedule(12, { season: 2025 }),
      client.teams.getStatistics(12, { season: 2025 }),
    ]);
    expect(teams.sports[0]?.leagues[0]?.teams.length).toBeGreaterThan(0);
    expect(roster.athletes.length).toBeGreaterThan(0);
    expect(schedule.events.length).toBeGreaterThan(0);
    expect(statistics.results).toBeDefined();
  });

  it('loads filtered news', async () => {
    const [teamNews, athleteNews] = await Promise.all([
      client.news.getForTeam(12, { limit: 1 }),
      client.news.getForAthlete(3_139_477, { limit: 1 }),
    ]);
    expect(teamNews.articles).toBeInstanceOf(Array);
    expect(athleteNews.articles).toBeInstanceOf(Array);
  });

  it('loads an athlete profile', async () => {
    const response = await client.athletes.getById(3_139_477);
    expect(response.athlete.id).toBe('3139477');
  });

  it('loads athlete statistics and a historical game log', async () => {
    const [statistics, gameLog] = await Promise.all([
      client.athletes.getStats(3_139_477),
      client.athletes.getGameLog(3_139_477, { season: 2025 }),
    ]);
    expect(statistics.categories).toBeInstanceOf(Array);
    expect(gameLog.categories).toBeInstanceOf(Array);
  });

  it('loads completed-season standings', async () => {
    const response = await client.standings.get({
      season: 2025,
      seasonType: 2,
      level: 2,
      type: 0,
    });
    expect(response.children.length).toBeGreaterThan(0);
  });

  it('loads a historical game summary', async () => {
    const response = await client.games.getSummary(401_772_510);
    expect(response.header).toBeTypeOf('object');
  });

  it('loads the matching core event', async () => {
    const response = await client.games.getById(401_772_510);
    expect(response.id).toBe('401772510');
  });
});
