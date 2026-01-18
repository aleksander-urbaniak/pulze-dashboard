import type { Alert } from "./types";

export type TrendRange = "1d" | "7d" | "14d" | "month" | "year";

export type TrendDatum = {
  label: string;
  tooltip: string;
  value: number;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function getMonthValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function buildMonthOptions(count = 12, baseDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1);
    return {
      value: getMonthValue(date),
      label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    };
  });
}

function buildHourlyBuckets(start: Date, hours: number) {
  return Array.from({ length: hours }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      start.getHours() + index
    );
    return {
      key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
      )}`,
      label: date.toLocaleTimeString("en-US", { hour: "numeric" }),
      tooltip: date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      value: 0
    };
  });
}

function buildDailyBuckets(start: Date, days: number, labelOptions: Intl.DateTimeFormatOptions) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      key: date.toDateString(),
      label: date.toLocaleDateString("en-US", labelOptions),
      tooltip: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
      value: 0
    };
  });
}

function buildMonthlyBuckets(start: Date, months: number) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      key: getMonthValue(date),
      label: date.toLocaleDateString("en-US", { month: "short" }),
      tooltip: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      value: 0
    };
  });
}

export function buildTrendData(
  alerts: Alert[],
  range: TrendRange,
  monthKey?: string
): TrendDatum[] {
  const now = new Date();

  if (range === "1d") {
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() - 23);
    const buckets = buildHourlyBuckets(start, 24);
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    alerts.forEach((alert) => {
      const ts = new Date(alert.timestamp);
      if (Number.isNaN(ts.getTime()) || ts < start) {
        return;
      }
      const key = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())} ${pad(
        ts.getHours()
      )}`;
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.value += 1;
      }
    });

    return buckets.map(({ label, tooltip, value }) => ({ label, tooltip, value }));
  }

  if (range === "7d" || range === "14d") {
    const days = range === "7d" ? 7 : 14;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    const buckets = buildDailyBuckets(start, days, { month: "short", day: "numeric" });
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    alerts.forEach((alert) => {
      const ts = new Date(alert.timestamp);
      if (Number.isNaN(ts.getTime()) || ts < start) {
        return;
      }
      const key = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).toDateString();
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.value += 1;
      }
    });

    return buckets.map(({ label, tooltip, value }) => ({ label, tooltip, value }));
  }

  if (range === "month") {
    const selectedValue = monthKey ?? getMonthValue(now);
    const [yearValue, monthValue] = selectedValue.split("-");
    const year = Number(yearValue);
    const month = Number(monthValue) - 1;
    const start = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const buckets = buildDailyBuckets(start, daysInMonth, { day: "numeric" });
    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    alerts.forEach((alert) => {
      const ts = new Date(alert.timestamp);
      if (Number.isNaN(ts.getTime())) {
        return;
      }
      if (ts.getFullYear() !== year || ts.getMonth() !== month) {
        return;
      }
      const key = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).toDateString();
      const bucket = bucketMap.get(key);
      if (bucket) {
        bucket.value += 1;
      }
    });

    return buckets.map(({ label, tooltip, value }) => ({ label, tooltip, value }));
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const buckets = buildMonthlyBuckets(start, 12);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  alerts.forEach((alert) => {
    const ts = new Date(alert.timestamp);
    if (Number.isNaN(ts.getTime()) || ts < start || ts >= end) {
      return;
    }
    const key = getMonthValue(ts);
    const bucket = bucketMap.get(key);
    if (bucket) {
      bucket.value += 1;
    }
  });

  return buckets.map(({ label, tooltip, value }) => ({ label, tooltip, value }));
}
