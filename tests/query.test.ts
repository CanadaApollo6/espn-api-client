import { describe, expect, it } from 'vitest';

import { createSearchParams } from '../src/utils/query';

describe('createSearchParams', () => {
  it('returns empty parameters for an omitted query', () => {
    expect(createSearchParams(undefined).toString()).toBe('');
  });

  it('serializes scalar values using URLSearchParams rules', () => {
    const params = createSearchParams({
      search: 'New York Jets',
      season: 2026,
      enabled: false,
      empty: '',
    });

    expect(params.toString()).toBe('search=New+York+Jets&season=2026&enabled=false&empty=');
  });

  it('repeats array keys while omitting nullish values', () => {
    const params = createSearchParams({
      league: ['nfl', null, undefined, 'college-football'],
      week: null,
      season: undefined,
      limit: [0, 25],
    });

    expect(params.getAll('league')).toEqual(['nfl', 'college-football']);
    expect(params.getAll('limit')).toEqual(['0', '25']);
    expect(params.has('week')).toBe(false);
    expect(params.has('season')).toBe(false);
  });
});
