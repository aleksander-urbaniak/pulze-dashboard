import type { Alert } from "./types";

export type TrendRange = "1d" | "7d" | "14d" | "month" | "year";

export type TrendDatum = {
  label: string;
  tooltip: string;
  value: number;
};

export const teamConfigs = [
  { id: "infra", name: "Core Infra", sources: ["Prometheus"] },
  { id: "platform", name: "Platform Ops", sources: ["Zabbix"] },
  { id: "apps", name: "App Health", sources: ["Kuma"] }
] as const;

export type AnalyticsSummary = {
  counts: {
    currentDay: number;
    lastDay: number;
    currentMonth: number;
    lastMonth: number;
    currentYear: number;
    lastYear: number;
  };
  topSources: Array<{ name: string; count: number }>;
  topNoisyAlerts: Array<{ name: string; count: number }>;
  meanDuration: number;
  medianDuration: number;
  frequency7d: { total: number; average: number; busiest: { date: string; count: number } };
  frequency30d: { total: number; average: number; busiest: { date: string; count: number } };
  teamStats: Array<{
    id: string;
    name: string;
    total: number;
    critical: number;
    topLabel: string;
    lastSeen: number;
  }>;
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

export function buildAnalyticsSummary(alerts: Alert[]): AnalyticsSummary {
  const now = new Date();
  const nowMs = now.getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);
  const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);

  const counts = {
    currentDay: 0,
    lastDay: 0,
    currentMonth: 0,
    lastMonth: 0,
    currentYear: 0,
    lastYear: 0
  };

  const traffic = new Map<string, number>();
  const noisyAlerts = new Map<string, number>();
  const durations: number[] = [];

  function buildDailyCounts(days: number) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
    const buckets = new Map<string, number>();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      buckets.set(date.toDateString(), 0);
    }
    alerts.forEach((alert) => {
      const ts = new Date(alert.timestamp);
      if (Number.isNaN(ts.getTime()) || ts < start) {
        return;
      }
      const key = new Date(ts.getFullYear(), ts.getMonth(), ts.getDate()).toDateString();
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    });
    const entries = Array.from(buckets.entries()).map(([key, value]) => ({ key, value }));
    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    const busiest = entries.reduce(
      (best, entry) => (entry.value > best.value ? entry : best),
      { key: start.toDateString(), value: 0 }
    );
    return {
      total,
      average: total / days,
      busiest: {
        date: new Date(busiest.key).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        }),
        count: busiest.value
      }
    };
  }

  alerts.forEach((alert) => {
    const ts = new Date(alert.timestamp);
    if (Number.isNaN(ts.getTime())) {
      return;
    }
    durations.push(Math.max(0, nowMs - ts.getTime()));
    if (ts >= startOfToday && ts < startOfTomorrow) {
      counts.currentDay += 1;
    } else if (ts >= startOfYesterday && ts < startOfToday) {
      counts.lastDay += 1;
    }
    if (ts >= startOfMonth && ts < startOfNextMonth) {
      counts.currentMonth += 1;
    } else if (ts >= startOfLastMonth && ts < startOfMonth) {
      counts.lastMonth += 1;
    }
    if (ts >= startOfYear && ts < startOfNextYear) {
      counts.currentYear += 1;
    } else if (ts >= startOfLastYear && ts < startOfYear) {
      counts.lastYear += 1;
    }

    const monitoringLabel = (alert.sourceLabel ?? alert.source).trim();
    if (monitoringLabel) {
      traffic.set(monitoringLabel, (traffic.get(monitoringLabel) ?? 0) + 1);
    }
    noisyAlerts.set(alert.name, (noisyAlerts.get(alert.name) ?? 0) + 1);
  });

  const topSources = Array.from(traffic.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topNoisyAlerts = Array.from(noisyAlerts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  const sortedDurations = [...durations].sort((a, b) => a - b);
  const meanDuration =
    durations.length === 0 ? 0 : durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const medianDuration =
    sortedDurations.length === 0
      ? 0
      : sortedDurations[Math.floor(sortedDurations.length / 2)];

  const frequency7d = buildDailyCounts(7);
  const frequency30d = buildDailyCounts(30);

  const teamStats = teamConfigs.map((team) => {
    const teamAlerts = alerts.filter((alert) => team.sources.includes(alert.source));
    const critical = teamAlerts.filter((alert) => alert.severity === "critical").length;
    const teamLabels = new Map<string, number>();
    teamAlerts.forEach((alert) => {
      const label = (alert.sourceLabel ?? alert.source).trim();
      if (label) {
        teamLabels.set(label, (teamLabels.get(label) ?? 0) + 1);
      }
    });
    const topLabel = Array.from(teamLabels.entries()).sort((a, b) => b[1] - a[1])[0];
    const lastSeen = teamAlerts.reduce((latest, alert) => {
      const ts = new Date(alert.timestamp).getTime();
      return Number.isNaN(ts) ? latest : Math.max(latest, ts);
    }, 0);
    return {
      id: team.id,
      name: team.name,
      total: teamAlerts.length,
      critical,
      topLabel: topLabel ? topLabel[0] : "None",
      lastSeen
    };
  });

  return {
    counts,
    topSources,
    topNoisyAlerts,
    meanDuration,
    medianDuration,
    frequency7d,
    frequency30d,
    teamStats
  };
}
