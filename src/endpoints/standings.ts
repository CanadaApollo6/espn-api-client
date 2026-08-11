import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type { QueryParams, QueryValue } from '../types/client';
import type { StandingsResponse } from '../types/standings';
import { siteV2LeaguePath } from '../utils/paths';
import { isTeam } from '../utils/response-guards';
import { expectArrayProperty, isRecord, validateInteger } from '../utils/validation';

export interface StandingsParams {
  readonly season?: number;
  readonly seasonType?: number;
  /** Table view: 0 overall, 1 playoff, 2 expanded, 3 division. */
  readonly type?: 0 | 1 | 2 | 3;
  /** Hierarchy depth: 1 league, 2 conference, 3 division. */
  readonly level?: 1 | 2 | 3;
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

function createStandingsQuery(params: StandingsParams): QueryParams {
  const { seasonType, ...query } = params;
  return seasonType === undefined ? query : { ...query, seasontype: seasonType };
}

function isStandingGroup(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }

  if (
    value.children !== undefined &&
    (!Array.isArray(value.children) || !value.children.every(isStandingGroup))
  ) {
    return false;
  }

  if (value.standings === undefined) {
    return true;
  }
  if (!isRecord(value.standings)) {
    return false;
  }

  const { entries } = value.standings;
  return (
    entries === undefined ||
    (Array.isArray(entries) &&
      entries.every(
        (entry) =>
          isRecord(entry) &&
          isTeam(entry.team) &&
          Array.isArray(entry.stats) &&
          entry.stats.every((stat) => isRecord(stat) && typeof stat.name === 'string'),
      ))
  );
}

function parseStandingsResponse(value: unknown): StandingsResponse {
  const response = expectArrayProperty(value, 'children', 'Standings API');
  const withSeasons = expectArrayProperty(response, 'seasons', 'Standings API');
  if (
    typeof response.id !== 'string' ||
    typeof response.name !== 'string' ||
    !response.children.every(isStandingGroup) ||
    !withSeasons.seasons.every((season) => isRecord(season) && typeof season.year === 'number')
  ) {
    throw new InvalidResponseError(
      'Standings API returned an invalid league, season, group, or entry.',
    );
  }
  return response as unknown as StandingsResponse;
}

export class StandingsAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** Get league, conference, or division standings. */
  public async get(params: StandingsParams = {}): Promise<StandingsResponse> {
    validateInteger(params.season, 'season', 1);
    validateInteger(params.seasonType, 'seasonType', 1, 4);
    validateInteger(params.type, 'type', 0, 3);
    validateInteger(params.level, 'level', 1, 3);
    const value = await this.client.request(
      'site',
      siteV2LeaguePath(this.client.sport, this.client.league, 'standings'),
      createStandingsQuery(params),
    );
    return parseStandingsResponse(value);
  }
}
