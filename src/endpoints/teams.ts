import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type { ESPNId, QueryParams, QueryValue } from '../types/client';
import type {
  RosterResponse,
  TeamResponse,
  TeamScheduleResponse,
  TeamStatisticsResponse,
  TeamsResponse,
} from '../types/teams';
import { siteLeaguePath } from '../utils/paths';
import { isEvent, isLeague, isTeam } from '../utils/response-guards';
import {
  expectArrayProperty,
  expectObjectProperty,
  isRecord,
  pathSegment,
  validateInteger,
} from '../utils/validation';

export interface TeamListParams {
  readonly limit?: number;
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

export interface TeamResourceParams {
  readonly season?: number;
  readonly seasonType?: number;
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

function createTeamResourceQuery(params: TeamResourceParams): QueryParams {
  const { seasonType, ...query } = params;
  return seasonType === undefined ? query : { ...query, seasontype: seasonType };
}

function validateTeamResourceParams(params: TeamResourceParams): void {
  validateInteger(params.season, 'season', 1);
  validateInteger(params.seasonType, 'seasonType', 1, 4);
}

function parseTeamsResponse(value: unknown): TeamsResponse {
  const response = expectArrayProperty(value, 'sports', 'Teams API');
  const validSports = response.sports.every(
    (sport) =>
      isRecord(sport) &&
      typeof sport.id === 'string' &&
      typeof sport.name === 'string' &&
      Array.isArray(sport.leagues) &&
      sport.leagues.every(
        (league) =>
          isLeague(league) &&
          Array.isArray(league.teams) &&
          league.teams.every((entry) => isRecord(entry) && isTeam(entry.team)),
      ),
  );
  if (!validSports) {
    throw new InvalidResponseError('Teams API returned an invalid sport or league list.');
  }
  return response as unknown as TeamsResponse;
}

function parseTeamResponse(value: unknown): TeamResponse {
  const response = expectObjectProperty(value, 'team', 'Team API');
  if (!isTeam(response.team)) {
    throw new InvalidResponseError('Team API returned an invalid team.');
  }
  return response as unknown as TeamResponse;
}

function parseRosterResponse(value: unknown): RosterResponse {
  const response = expectArrayProperty(value, 'athletes', 'Roster API');
  const team = expectObjectProperty(response, 'team', 'Roster API').team;
  const validAthletes = response.athletes.every(
    (group) =>
      isRecord(group) &&
      typeof group.position === 'string' &&
      Array.isArray(group.items) &&
      group.items.every(isTeam),
  );
  if (!isTeam(team) || !validAthletes) {
    throw new InvalidResponseError('Roster API returned an invalid team or athlete group.');
  }
  return response as unknown as RosterResponse;
}

function parseScheduleResponse(value: unknown): TeamScheduleResponse {
  const response = expectArrayProperty(value, 'events', 'Team schedule API');
  const team = expectObjectProperty(response, 'team', 'Team schedule API').team;
  const requestedSeason = expectObjectProperty(
    response,
    'requestedSeason',
    'Team schedule API',
  ).requestedSeason;
  if (
    !isTeam(team) ||
    !response.events.every(isEvent) ||
    typeof requestedSeason.year !== 'number'
  ) {
    throw new InvalidResponseError(
      'Team schedule API returned an invalid team, event, or requested season.',
    );
  }
  return response as unknown as TeamScheduleResponse;
}

function parseStatisticsResponse(value: unknown): TeamStatisticsResponse {
  const response = expectObjectProperty(value, 'team', 'Team statistics API');
  if (!isTeam(response.team) || !('results' in response)) {
    throw new InvalidResponseError(
      'Team statistics API returned an invalid team or no `results` field.',
    );
  }
  return response as unknown as TeamStatisticsResponse;
}

export class TeamsAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** List teams for the client's league. */
  public async getAll(params: TeamListParams = {}): Promise<TeamsResponse> {
    validateInteger(params.limit, 'limit', 1);
    const value = await this.client.request(
      'site',
      siteLeaguePath(this.client.sport, this.client.league, 'teams'),
      params,
    );
    return parseTeamsResponse(value);
  }

  /** Get a team by numeric ID or ESPN abbreviation. */
  public async getById(teamId: ESPNId, params: TeamResourceParams = {}): Promise<TeamResponse> {
    validateTeamResourceParams(params);
    const value = await this.client.request(
      'site',
      siteLeaguePath(
        this.client.sport,
        this.client.league,
        `teams/${pathSegment(teamId, 'teamId')}`,
      ),
      createTeamResourceQuery(params),
    );
    return parseTeamResponse(value);
  }

  /** Get a team's active roster, grouped by position. */
  public async getRoster(teamId: ESPNId, params: TeamResourceParams = {}): Promise<RosterResponse> {
    const value = await this.getTeamResource(teamId, 'roster', params);
    return parseRosterResponse(value);
  }

  /** Get a team's schedule. */
  public async getSchedule(
    teamId: ESPNId,
    params: TeamResourceParams = {},
  ): Promise<TeamScheduleResponse> {
    const value = await this.getTeamResource(teamId, 'schedule', params);
    return parseScheduleResponse(value);
  }

  /** Get a team's statistics. */
  public async getStatistics(
    teamId: ESPNId,
    params: TeamResourceParams = {},
  ): Promise<TeamStatisticsResponse> {
    const value = await this.getTeamResource(teamId, 'statistics', params);
    return parseStatisticsResponse(value);
  }

  private async getTeamResource(
    teamId: ESPNId,
    resource: string,
    params: TeamResourceParams,
  ): Promise<unknown> {
    validateTeamResourceParams(params);
    return this.client.request(
      'site',
      siteLeaguePath(
        this.client.sport,
        this.client.league,
        `teams/${pathSegment(teamId, 'teamId')}/${resource}`,
      ),
      createTeamResourceQuery(params),
    );
  }
}
