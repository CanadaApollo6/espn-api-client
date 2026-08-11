import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type { ESPNId, QueryValue } from '../types/client';
import type { CoreEventResponse, GameSummaryResponse } from '../types/games';
import { coreLeaguePath, siteLeaguePath } from '../utils/paths';
import { expectObjectProperty, expectRecord, idValue, pathSegment } from '../utils/validation';

export interface GameParams {
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

function parseSummaryResponse(value: unknown): GameSummaryResponse {
  const response = expectObjectProperty(value, 'header', 'Game summary API');
  return response;
}

function parseCoreEventResponse(value: unknown): CoreEventResponse {
  const response = expectRecord(value, 'Core event API');
  if (typeof response.id !== 'string' || typeof response.name !== 'string') {
    throw new InvalidResponseError('Core event API returned an invalid event.');
  }
  return response as unknown as CoreEventResponse;
}

export class GamesAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** Get the rich, sport-specific summary used by ESPN game pages. */
  public async getSummary(eventId: ESPNId, params: GameParams = {}): Promise<GameSummaryResponse> {
    const value = await this.client.request(
      'site',
      siteLeaguePath(this.client.sport, this.client.league, 'summary'),
      { ...params, event: idValue(eventId, 'eventId') },
    );
    return parseSummaryResponse(value);
  }

  /** Get the normalized core event record. */
  public async getById(eventId: ESPNId, params: GameParams = {}): Promise<CoreEventResponse> {
    const value = await this.client.request(
      'core',
      coreLeaguePath(
        this.client.sport,
        this.client.league,
        `events/${pathSegment(eventId, 'eventId')}`,
      ),
      params,
    );
    return parseCoreEventResponse(value);
  }
}
