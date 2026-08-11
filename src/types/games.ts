import type { ESPNLeague, ESPNLink, ESPNSeason } from './common';
import type { ESPNCompetition } from './scoreboard';

/**
 * ESPN game summaries vary significantly by sport. Common fields are typed and
 * sport-specific sections remain optional and raw.
 */
export interface GameSummaryResponse {
  readonly header: Readonly<Record<string, unknown>>;
  readonly boxscore?: Readonly<Record<string, unknown>>;
  readonly gameInfo?: Readonly<Record<string, unknown>>;
  readonly drives?: Readonly<Record<string, unknown>>;
  readonly plays?: readonly unknown[];
  readonly playsMap?: Readonly<Record<string, unknown>>;
  readonly atBats?: readonly unknown[];
  readonly leaders?: readonly unknown[];
  readonly injuries?: readonly unknown[];
  readonly broadcasts?: readonly unknown[];
  readonly odds?: readonly unknown[];
  readonly scoringPlays?: readonly unknown[];
  readonly commentary?: readonly unknown[];
  readonly keyEvents?: readonly unknown[];
  readonly rosters?: readonly unknown[];
  readonly news?: unknown;
  readonly videos?: readonly unknown[];
  readonly standings?: unknown;
  readonly [key: string]: unknown;
}

export interface CoreEventResponse {
  readonly id: string;
  readonly name: string;
  readonly uid?: string;
  readonly shortName?: string;
  readonly date?: string;
  readonly season?: ESPNSeason | Readonly<Record<string, unknown>>;
  readonly seasonType?: Readonly<Record<string, unknown>>;
  readonly week?: Readonly<Record<string, unknown>>;
  readonly competitions?: readonly ESPNCompetition[];
  readonly links?: readonly ESPNLink[];
  readonly league?: ESPNLeague | Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}
