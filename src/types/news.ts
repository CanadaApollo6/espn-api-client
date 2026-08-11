import type { ESPNImage, ESPNLink } from './common';

export interface ESPNArticle {
  readonly id: number | string;
  readonly headline: string;
  readonly description?: string;
  readonly published?: string;
  readonly lastModified?: string;
  readonly byline?: string;
  readonly type?: string;
  readonly premium?: boolean;
  readonly images?: readonly ESPNImage[];
  readonly links?: Readonly<Record<string, unknown>>;
  readonly categories?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface NewsResponse {
  readonly articles: readonly ESPNArticle[];
  readonly header?: string;
  readonly link?: ESPNLink;
  readonly [key: string]: unknown;
}
