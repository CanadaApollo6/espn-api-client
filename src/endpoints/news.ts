import type { ESPNClient } from '../client';
import { InvalidResponseError } from '../errors';
import type { ESPNId, QueryValue } from '../types/client';
import type { NewsResponse } from '../types/news';
import { siteLeaguePath } from '../utils/paths';
import { expectArrayProperty, idValue, isRecord, validateInteger } from '../utils/validation';

export interface NewsParams {
  readonly limit?: number;
  readonly lang?: string;
  readonly region?: string;
  readonly [key: string]: QueryValue;
}

function parseNewsResponse(value: unknown): NewsResponse {
  const response = expectArrayProperty(value, 'articles', 'News API');
  const validArticles = response.articles.every(
    (article) =>
      isRecord(article) &&
      (typeof article.id === 'number' || typeof article.id === 'string') &&
      typeof article.headline === 'string',
  );
  if (!validArticles) {
    throw new InvalidResponseError('News API returned an invalid article.');
  }
  return response as unknown as NewsResponse;
}

export class NewsAPI {
  public constructor(private readonly client: ESPNClient) {}

  /** Get league news. */
  public async get(params: NewsParams = {}): Promise<NewsResponse> {
    validateInteger(params.limit, 'limit', 1);
    const value = await this.client.request(
      'site',
      siteLeaguePath(this.client.sport, this.client.league, 'news'),
      params,
    );
    return parseNewsResponse(value);
  }

  /** Get news filtered to a team. */
  public async getForTeam(teamId: ESPNId, params: NewsParams = {}): Promise<NewsResponse> {
    return this.get({ ...params, team: idValue(teamId, 'teamId') });
  }

  /** Get news filtered to an athlete. */
  public async getForAthlete(athleteId: ESPNId, params: NewsParams = {}): Promise<NewsResponse> {
    return this.get({ ...params, athlete: idValue(athleteId, 'athleteId') });
  }
}
