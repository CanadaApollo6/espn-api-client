import type { QueryParams, QueryValue } from '../types/client';

function appendValue(params: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (item !== undefined && item !== null) {
        params.append(key, String(item));
      }
    }
    return;
  }

  params.append(key, String(value));
}

export function createSearchParams(query: QueryParams | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (query === undefined) {
    return params;
  }

  for (const [key, value] of Object.entries(query)) {
    appendValue(params, key, value);
  }
  return params;
}
