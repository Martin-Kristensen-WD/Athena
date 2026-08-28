export const RANGE_OPTIONS = ["1w", "1m", "3m", "6m", "1y", "all"] as const;

export type RangeOption = (typeof RANGE_OPTIONS)[number];

export const RANGE_LABELS: Record<RangeOption, string> = {
  "1w": "1U",
  "1m": "1M",
  "3m": "3M",
  "6m": "6M",
  "1y": "1Å",
  all: "Alt",
};

const RANGE_DAYS: Record<Exclude<RangeOption, "all">, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

export function parseRangeParam(range: string | undefined): RangeOption {
  return RANGE_OPTIONS.includes(range as RangeOption) ? (range as RangeOption) : "3m";
}

export function rangeStart(range: RangeOption): Date | null {
  if (range === "all") return null;
  return new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
}
