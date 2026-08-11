import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type { QueryParams, QueryValue } from '../types/client';
import type { ScoreboardResponse } from '../types/scoreboard';
import { siteLeaguePath } from '../utils/paths';
import { isEvent, isLeague } from '../utils/response-guards';
import { expectArrayProperty, validateInteger } from '../utils/validation';

export interface ScoreboardParams {
  /** A year, YYYYMMDD date, or YYYYMMDD-YYYYMMDD range. */
  readonly dates?: string | number;
  readonly seasonType?: number;
  readonly week?: number;
  readonly limit?: number;
  readonly groups?: string | number;
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

function createScoreboardQuery(params: ScoreboardParams): QueryParams {
  const { seasonType, ...query } = params;
  return seasonType === undefined ? query : { ...query, seasontype: seasonType };
}

function parseScoreboardResponse(value: unknown): ScoreboardResponse {
  const response = expectArrayProperty(value, 'events', 'Scoreboard API');
  const withLeagues = expectArrayProperty(response, 'leagues', 'Scoreboard API');
  if (!withLeagues.leagues.every(isLeague)) {
    throw new InvalidResponseError('Scoreboard API returned an invalid league.');
  }
  if (!response.events.every(isEvent)) {
    throw new InvalidResponseError('Scoreboard API returned an invalid event or competition.');
  }
  return response as unknown as ScoreboardResponse;
}

export class ScoreboardAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** Get a league scoreboard, schedule, or date range. */
  public async get(params: ScoreboardParams = {}): Promise<ScoreboardResponse> {
    validateInteger(params.seasonType, 'seasonType', 1, 4);
    validateInteger(params.week, 'week', 1);
    validateInteger(params.limit, 'limit', 1);
    const value = await this.client.request(
      'site',
      siteLeaguePath(this.client.sport, this.client.league, 'scoreboard'),
      createScoreboardQuery(params),
    );
    return parseScoreboardResponse(value);
  }
}
