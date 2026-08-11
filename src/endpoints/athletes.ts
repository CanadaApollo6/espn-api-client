import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type {
  AthleteGameLogResponse,
  AthleteProfileResponse,
  AthleteStatsResponse,
} from '../types/athletes';
import type { ESPNId, QueryValue } from '../types/client';
import { webLeaguePath } from '../utils/paths';
import {
  expectArrayProperty,
  expectObjectProperty,
  pathSegment,
  validateInteger,
} from '../utils/validation';

export interface AthleteParams {
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

export interface AthleteGameLogParams extends AthleteParams {
  readonly season?: number;
}

function parseProfileResponse(value: unknown): AthleteProfileResponse {
  const response = expectObjectProperty(value, 'athlete', 'Athlete profile API');
  if (typeof response.athlete.id !== 'string' || typeof response.athlete.displayName !== 'string') {
    throw new InvalidResponseError('Athlete profile API returned an invalid athlete.');
  }
  return response as unknown as AthleteProfileResponse;
}

function parseStatsResponse(value: unknown): AthleteStatsResponse {
  const response = expectArrayProperty(value, 'categories', 'Athlete stats API');
  expectArrayProperty(response, 'filters', 'Athlete stats API');
  expectArrayProperty(response, 'glossary', 'Athlete stats API');
  expectObjectProperty(response, 'teams', 'Athlete stats API');
  return response as unknown as AthleteStatsResponse;
}

function parseGameLogResponse(value: unknown): AthleteGameLogResponse {
  const response = expectArrayProperty(value, 'categories', 'Athlete game log API');
  expectArrayProperty(response, 'seasonTypes', 'Athlete game log API');
  expectObjectProperty(response, 'events', 'Athlete game log API');
  return response as unknown as AthleteGameLogResponse;
}

export class AthletesAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** Get ESPN's denormalized athlete profile. */
  public async getById(
    athleteId: ESPNId,
    params: AthleteParams = {},
  ): Promise<AthleteProfileResponse> {
    const value = await this.getAthleteResource(athleteId, undefined, params);
    return parseProfileResponse(value);
  }

  /** Get an athlete's career and season statistics. */
  public async getStats(
    athleteId: ESPNId,
    params: AthleteParams = {},
  ): Promise<AthleteStatsResponse> {
    const value = await this.getAthleteResource(athleteId, 'stats', params);
    return parseStatsResponse(value);
  }

  /** Get an athlete's game log. Unlike the profile route, this honors `season`. */
  public async getGameLog(
    athleteId: ESPNId,
    params: AthleteGameLogParams = {},
  ): Promise<AthleteGameLogResponse> {
    validateInteger(params.season, 'season', 1);
    const value = await this.getAthleteResource(athleteId, 'gamelog', params);
    return parseGameLogResponse(value);
  }

  private getAthleteResource(
    athleteId: ESPNId,
    resource: string | undefined,
    params: AthleteParams,
  ): Promise<unknown> {
    const athletePath = `athletes/${pathSegment(athleteId, 'athleteId')}`;
    return this.client.request(
      'web',
      webLeaguePath(
        this.client.sport,
        this.client.league,
        resource === undefined ? athletePath : `${athletePath}/${resource}`,
      ),
      params,
    );
  }
}
