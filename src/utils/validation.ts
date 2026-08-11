import { InvalidResponseError } from '../errors';
import type { ESPNId } from '../types/client';

export function requireNonEmptyString(value: string, name: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new TypeError(`${name} must be a non-empty string.`);
  }
  return normalized;
}

export function idValue(value: ESPNId, name: string): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number or non-empty string.`);
  }

  const normalized = String(value).trim();
  if (normalized.length === 0) {
    throw new TypeError(`${name} must be a finite number or non-empty string.`);
  }

  return normalized;
}

export function pathSegment(value: ESPNId, name: string): string {
  return encodeURIComponent(idValue(value, name));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function expectRecord(value: unknown, endpoint: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new InvalidResponseError(`${endpoint} returned a non-object response.`);
  }
  return value;
}

export function expectArrayProperty<Property extends string>(
  value: unknown,
  property: Property,
  endpoint: string,
): Record<string, unknown> & Readonly<Record<Property, readonly unknown[]>> {
  const record = expectRecord(value, endpoint);
  if (!Array.isArray(record[property])) {
    throw new InvalidResponseError(
      `${endpoint} returned an invalid response: expected \`${property}\` to be an array.`,
    );
  }
  return record as Record<string, unknown> & Readonly<Record<Property, readonly unknown[]>>;
}

export function expectObjectProperty<Property extends string>(
  value: unknown,
  property: Property,
  endpoint: string,
): Record<string, unknown> & Readonly<Record<Property, Readonly<Record<string, unknown>>>> {
  const record = expectRecord(value, endpoint);
  if (!isRecord(record[property])) {
    throw new InvalidResponseError(
      `${endpoint} returned an invalid response: expected \`${property}\` to be an object.`,
    );
  }
  return record as Record<string, unknown> &
    Readonly<Record<Property, Readonly<Record<string, unknown>>>>;
}

export function validateInteger(
  value: number | undefined,
  name: string,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): void {
  if (value !== undefined && (!Number.isInteger(value) || value < minimum || value > maximum)) {
    const range = Number.isFinite(maximum)
      ? ` between ${String(minimum)} and ${String(maximum)}`
      : ` >= ${String(minimum)}`;
    throw new TypeError(`${name} must be an integer${range}.`);
  }
}
