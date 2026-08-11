import type { ESPNImage, ESPNLeague, ESPNLink, ESPNLogo, ESPNPosition } from './common';
import type { ESPNEvent } from './scoreboard';

export interface ESPNTeam {
  readonly id: string;
  readonly displayName: string;
  readonly uid?: string;
  readonly slug?: string;
  readonly location?: string;
  readonly name?: string;
  readonly nickname?: string;
  readonly abbreviation?: string;
  readonly shortDisplayName?: string;
  readonly color?: string;
  readonly alternateColor?: string;
  readonly isActive?: boolean;
  readonly logos?: readonly ESPNLogo[];
  readonly links?: readonly ESPNLink[];
  readonly [key: string]: unknown;
}

export interface ESPNTeamEntry {
  readonly team: ESPNTeam;
  readonly [key: string]: unknown;
}

export interface ESPNTeamsLeague extends ESPNLeague {
  readonly teams: readonly ESPNTeamEntry[];
}

export interface ESPNSport {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly leagues: readonly ESPNTeamsLeague[];
  readonly [key: string]: unknown;
}

export interface TeamsResponse {
  readonly sports: readonly ESPNSport[];
  readonly [key: string]: unknown;
}

export interface TeamResponse {
  readonly team: ESPNTeam;
  readonly [key: string]: unknown;
}

export interface ESPNRosterAthlete {
  readonly id: string;
  readonly displayName: string;
  readonly uid?: string;
  readonly guid?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly fullName?: string;
  readonly shortName?: string;
  readonly jersey?: string;
  readonly position?: ESPNPosition;
  readonly headshot?: ESPNImage;
  readonly age?: number;
  readonly displayHeight?: string;
  readonly displayWeight?: string;
  readonly active?: boolean;
  readonly [key: string]: unknown;
}

export interface ESPNRosterGroup {
  readonly position: string;
  readonly items: readonly ESPNRosterAthlete[];
  readonly [key: string]: unknown;
}

export interface RosterResponse {
  readonly athletes: readonly ESPNRosterGroup[];
  readonly team: ESPNTeam;
  readonly timestamp?: string;
  readonly status?: string;
  readonly season?: unknown;
  readonly coach?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface TeamScheduleResponse {
  readonly team: ESPNTeam;
  readonly events: readonly ESPNEvent[];
  readonly requestedSeason: ESPNSeasonSelection;
  readonly timestamp?: string;
  readonly status?: string;
  readonly season?: unknown;
  readonly byeWeek?: number;
  readonly [key: string]: unknown;
}

export interface ESPNSeasonSelection {
  readonly year: number;
  readonly displayName?: string;
  readonly type?: number;
  readonly name?: string;
  readonly [key: string]: unknown;
}

export interface TeamStatisticsResponse {
  readonly team: ESPNTeam;
  readonly results: unknown;
  readonly requestedSeason?: ESPNSeasonSelection;
  readonly status?: string;
  readonly season?: unknown;
  readonly [key: string]: unknown;
}
