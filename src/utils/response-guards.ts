import type { ESPNLeague } from '../types/common';
import type { ESPNCompetition, ESPNEvent } from '../types/scoreboard';
import type { ESPNTeam } from '../types/teams';
import { isRecord } from './validation';

export function isTeam(value: unknown): value is ESPNTeam {
  return isRecord(value) && typeof value.id === 'string' && typeof value.displayName === 'string';
}

export function isLeague(value: unknown): value is ESPNLeague {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

function isCompetition(value: unknown): value is ESPNCompetition {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.competitors)) {
    return false;
  }

  return value.competitors.every(
    (competitor) =>
      isRecord(competitor) &&
      typeof competitor.id === 'string' &&
      typeof competitor.homeAway === 'string' &&
      isTeam(competitor.team),
  );
}

export function isEvent(value: unknown): value is ESPNEvent {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }

  return (
    value.competitions === undefined ||
    (Array.isArray(value.competitions) && value.competitions.every(isCompetition))
  );
}
