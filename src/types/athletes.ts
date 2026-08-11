import type { ESPNImage, ESPNLeague, ESPNLink, ESPNPosition, ESPNSeason } from './common';
import type { ESPNTeam } from './teams';

export interface ESPNAthlete {
  readonly id: string;
  readonly displayName: string;
  readonly uid?: string;
  readonly guid?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly fullName?: string;
  readonly shortName?: string;
  readonly slug?: string;
  readonly jersey?: string;
  readonly position?: ESPNPosition;
  readonly team?: ESPNTeam;
  readonly headshot?: ESPNImage;
  readonly links?: readonly ESPNLink[];
  readonly active?: boolean;
  readonly status?: unknown;
  readonly age?: number;
  readonly displayBirthPlace?: string;
  readonly displayHeight?: string;
  readonly displayWeight?: string;
  readonly displayDOB?: string;
  readonly displayExperience?: string;
  readonly displayDraft?: string;
  readonly [key: string]: unknown;
}

export interface AthleteProfileResponse {
  readonly athlete: ESPNAthlete;
  readonly season?: ESPNSeason;
  readonly league?: ESPNLeague;
  readonly playerSwitcher?: unknown;
  readonly quicklinks?: readonly ESPNLink[];
  readonly links?: readonly ESPNLink[];
  readonly standings?: unknown;
  readonly videos?: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface AthleteStatsResponse {
  readonly filters: readonly unknown[];
  readonly teams: Readonly<Record<string, unknown>>;
  readonly categories: readonly unknown[];
  readonly glossary: readonly unknown[];
  readonly [key: string]: unknown;
}

export interface AthleteGameLogResponse {
  readonly categories: readonly unknown[];
  readonly events: Readonly<Record<string, unknown>>;
  readonly seasonTypes: readonly unknown[];
  readonly filters?: readonly unknown[];
  readonly labels?: readonly string[];
  readonly names?: readonly string[];
  readonly displayNames?: readonly string[];
  readonly glossary?: readonly unknown[];
  readonly [key: string]: unknown;
}
