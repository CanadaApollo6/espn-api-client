import type { ESPNLink, ESPNSeason } from './common';
import type { ESPNTeam } from './teams';

export interface ESPNStandingStat {
  readonly name: string;
  readonly displayName?: string;
  readonly shortDisplayName?: string;
  readonly description?: string;
  readonly abbreviation?: string;
  readonly type?: string;
  readonly value?: number;
  readonly displayValue?: string;
  readonly [key: string]: unknown;
}

export interface ESPNStandingEntry {
  readonly team: ESPNTeam;
  readonly stats: readonly ESPNStandingStat[];
  readonly note?: unknown;
  readonly [key: string]: unknown;
}

export interface ESPNStandingGroup {
  readonly id: string;
  readonly name: string;
  readonly abbreviation?: string;
  readonly uid?: string;
  readonly isConference?: boolean;
  readonly standings?: {
    readonly entries?: readonly ESPNStandingEntry[];
    readonly [key: string]: unknown;
  };
  readonly children?: readonly ESPNStandingGroup[];
  readonly [key: string]: unknown;
}

export interface StandingsResponse {
  readonly id: string;
  readonly name: string;
  readonly children: readonly ESPNStandingGroup[];
  readonly seasons: readonly ESPNSeason[];
  readonly uid?: string;
  readonly abbreviation?: string;
  readonly shortName?: string;
  readonly isConference?: boolean;
  readonly season?: ESPNSeason | Readonly<Record<string, unknown>>;
  readonly links?: readonly ESPNLink[];
  readonly [key: string]: unknown;
}
