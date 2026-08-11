import { pathSegment } from './validation';

export function siteLeaguePath(sport: string, league: string, resource: string): string {
  return `/apis/site/v2/sports/${pathSegment(sport, 'sport')}/${pathSegment(league, 'league')}/${resource}`;
}

export function siteV2LeaguePath(sport: string, league: string, resource: string): string {
  return `/apis/v2/sports/${pathSegment(sport, 'sport')}/${pathSegment(league, 'league')}/${resource}`;
}

export function webLeaguePath(sport: string, league: string, resource: string): string {
  return `/apis/common/v3/sports/${pathSegment(sport, 'sport')}/${pathSegment(league, 'league')}/${resource}`;
}

export function coreLeaguePath(sport: string, league: string, resource: string): string {
  return `/v2/sports/${pathSegment(sport, 'sport')}/leagues/${pathSegment(league, 'league')}/${resource}`;
}
