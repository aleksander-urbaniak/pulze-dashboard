import type { TrendRange } from "../../lib/analytics";

export const trendRanges: Array<{ value: TrendRange; label: string }> = [
  { value: "1d", label: "1D" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "month", label: "Month" },
  { value: "year", label: "Last year" }
];

export const trendStorageKey = "pulze.analytics.trend";

export const alertLogPageOptions = [10, 25, 50, 100].map((value) => ({
  value: String(value),
  label: `${value}/page`
}));
