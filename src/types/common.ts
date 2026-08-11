export interface ESPNReference {
  readonly $ref: string;
  readonly [key: string]: unknown;
}

export interface ESPNLink {
  readonly href: string;
  readonly text?: string;
  readonly shortText?: string;
  readonly rel?: readonly string[];
  readonly language?: string;
  readonly isExternal?: boolean;
  readonly isPremium?: boolean;
  readonly [key: string]: unknown;
}

export interface ESPNImage {
  readonly href?: string;
  readonly url?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alt?: string;
  readonly rel?: readonly string[];
  readonly [key: string]: unknown;
}

export interface ESPNLogo extends ESPNImage {
  readonly href: string;
}

export interface ESPNSeason {
  readonly year: number;
  readonly displayName?: string;
  readonly type?: number | Readonly<Record<string, unknown>>;
  readonly types?: unknown;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly [key: string]: unknown;
}

export interface ESPNLeague {
  readonly id: string;
  readonly name: string;
  readonly abbreviation?: string;
  readonly shortName?: string;
  readonly slug?: string;
  readonly uid?: string;
  readonly logos?: readonly ESPNLogo[];
  readonly [key: string]: unknown;
}

export interface ESPNPosition {
  readonly id?: string;
  readonly name?: string;
  readonly displayName?: string;
  readonly abbreviation?: string;
  readonly leaf?: boolean;
  readonly [key: string]: unknown;
}

export interface ESPNStatus {
  readonly id?: string;
  readonly name?: string;
  readonly type?: string;
  readonly description?: string;
  readonly detail?: string;
  readonly shortDetail?: string;
  readonly state?: string;
  readonly completed?: boolean;
  readonly [key: string]: unknown;
}

export interface ESPNPaginatedResponse<T> {
  readonly count: number;
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly pageCount: number;
  readonly items: readonly T[];
  readonly [key: string]: unknown;
}
