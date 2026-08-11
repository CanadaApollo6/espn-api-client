import type { ESPNLeague, ESPNLink, ESPNSeason, ESPNStatus } from './common';
import type { ESPNTeam } from './teams';

export interface ESPNCompetitor {
  readonly id: string;
  readonly homeAway: string;
  readonly team: ESPNTeam;
  readonly score?: string;
  readonly winner?: boolean;
  readonly order?: number;
  readonly records?: readonly unknown[];
  readonly statistics?: readonly unknown[];
  readonly linescores?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface ESPNCompetition {
  readonly id: string;
  readonly competitors: readonly ESPNCompetitor[];
  readonly date?: string;
  readonly attendance?: number;
  readonly neutralSite?: boolean;
  readonly conferenceCompetition?: boolean;
  readonly playByPlayAvailable?: boolean;
  readonly venue?: unknown;
  readonly status?: ESPNStatus | Readonly<Record<string, unknown>>;
  readonly broadcasts?: readonly unknown[];
  readonly leaders?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface ESPNEvent {
  readonly id: string;
  readonly name: string;
  readonly shortName?: string;
  readonly uid?: string;
  readonly date?: string;
  readonly season?: ESPNSeason | Readonly<Record<string, unknown>>;
  readonly week?: Readonly<Record<string, unknown>>;
  readonly competitions?: readonly ESPNCompetition[];
  readonly links?: readonly ESPNLink[];
  readonly status?: ESPNStatus | Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface ScoreboardResponse {
  readonly leagues: readonly ESPNLeague[];
  readonly events: readonly ESPNEvent[];
  readonly season?: ESPNSeason | Readonly<Record<string, unknown>>;
  readonly week?: Readonly<Record<string, unknown>>;
  readonly provider?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}
