"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/Sidebar";
import AlertChart from "../../components/AlertChart";
import {
  buildMonthOptions,
  buildTrendData,
  getMonthValue,
  type TrendRange
} from "../../lib/analytics";
import type { Alert, User } from "../../lib/types";

type UserResponse = { user: User };
type AlertResponse = { alerts: Alert[]; errors: Array<{ source: string; message: string }> };
const trendRanges: Array<{ value: TrendRange; label: string }> = [
  { value: "1d", label: "1D" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "month", label: "Month" },
  { value: "year", label: "Last year" }
];
const teamConfigs = [
  { id: "infra", name: "Core Infra", sources: ["Prometheus"] },
  { id: "platform", name: "Platform Ops", sources: ["Zabbix"] },
  { id: "apps", name: "App Health", sources: ["Kuma"] }
] as const;

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0m";
  }
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) {
      return { trend: "up" as const, text: "0.0%" };
    }
    return { trend: "up" as const, text: "+100.0%" };
  }
  const diff = ((current - previous) / previous) * 100;
  const trend = diff >= 0 ? "up" : "down";
  const text = `${diff >= 0 ? "+" : ""}${Math.abs(diff).toFixed(1)}%`;
  return { trend, text };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<Array<{ source: string; message: string }>>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>("14d");
  const [trendMonth, setTrendMonth] = useState(() => getMonthValue(new Date()));

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      void loadAlerts();
    }
  }, [user]);

  const analytics = useMemo(() => {
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
  }, [alerts]);

  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const trendData = useMemo(
    () => buildTrendData(alerts, trendRange, trendMonth),
    [alerts, trendRange, trendMonth]
  );
  const activeDelta = formatDelta(alerts.length, analytics.counts.lastDay);
  const dayDelta = formatDelta(analytics.counts.currentDay, analytics.counts.lastDay);
  const monthDelta = formatDelta(analytics.counts.currentMonth, analytics.counts.lastMonth);
  const yearDelta = formatDelta(analytics.counts.currentYear, analytics.counts.lastYear);
  const statCards = [
    {
      id: "active",
      title: "Active Alerts",
      value: alerts.length.toLocaleString(),
      change: activeDelta.text,
      trend: activeDelta.trend,
      color: "text-rose-600",
      bg: "bg-rose-100",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 7v6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M12 17h.01"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4.5 19h15L12 5 4.5 19Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      id: "today",
      title: "Alerts Today",
      value: analytics.counts.currentDay.toLocaleString(),
      change: dayDelta.text,
      trend: dayDelta.trend,
      color: "text-amber-600",
      bg: "bg-amber-100",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 8v4l2.5 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    },
    {
      id: "month",
      title: "Alerts This Month",
      value: analytics.counts.currentMonth.toLocaleString(),
      change: monthDelta.text,
      trend: monthDelta.trend,
      color: "text-sky-600",
      bg: "bg-sky-100",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 4v4M16 4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: "year",
      title: "Alerts This Year",
      value: analytics.counts.currentYear.toLocaleString(),
      change: yearDelta.text,
      trend: yearDelta.trend,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 16l5-5 4 4 6-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 8h4v4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )
    }
  ];

  async function loadSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setIsLoading(false);
      router.push("/");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setIsLoading(false);
  }

  async function loadAlerts() {
    setIsLoadingAlerts(true);
    const response = await fetch("/api/alerts");
    if (!response.ok) {
      setIsLoadingAlerts(false);
      return;
    }
    const data = (await response.json()) as AlertResponse;
    setAlerts(data.alerts);
    setErrors(data.errors ?? []);
    setIsLoadingAlerts(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-3xl border border-border bg-surface/90 px-6 py-4 text-sm text-muted shadow-card">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1">
        <main className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Analytics</p>
              <h2 className="mt-2 text-3xl font-semibold">Traffic insights</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadAlerts()}
              className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
            >
              {isLoadingAlerts ? "Refreshing" : "Refresh"}
            </button>
          </div>

          {errors.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {errors.map((error) => `${error.source}: ${error.message}`).join(" | ")}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl border border-border bg-surface/90 p-5 shadow-card backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}
                  >
                    {card.icon}
                  </div>
                  <div
                    className={
                      card.trend === "up"
                        ? "flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600"
                        : "flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
                    }
                  >
                    {card.trend === "up" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M7 14l5-5 5 5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M7 10l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {card.change}
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted">{card.title}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Alert Trend</p>
                  <h3 className="mt-2 text-2xl font-semibold">Alert trendline</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {trendRanges.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => setTrendRange(range.value)}
                      className={
                        trendRange === range.value
                          ? "rounded-full border border-accent bg-accent px-3 py-1 text-xs uppercase tracking-[0.2em] text-white"
                          : "rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                      }
                    >
                      {range.label}
                    </button>
                  ))}
                  {trendRange === "month" ? (
                    <select
                      value={trendMonth}
                      onChange={(event) => setTrendMonth(event.target.value)}
                      className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em]"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <span className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                    {alerts.length} total
                  </span>
                </div>
              </div>
              <AlertChart data={trendData} />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Day", last: analytics.counts.lastDay, current: analytics.counts.currentDay },
                  { label: "Month", last: analytics.counts.lastMonth, current: analytics.counts.currentMonth },
                  { label: "Year", last: analytics.counts.lastYear, current: analytics.counts.currentYear }
                ].map((row) => (
                  <div key={row.label} className="rounded-2xl border border-border bg-base/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">{row.label}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted">Last</span>
                      <span className="font-semibold">{row.last}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span className="text-muted">Current</span>
                      <span className="font-semibold">{row.current}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Monitoring Instances</p>
              <h3 className="mt-2 text-2xl font-semibold">Most active instances</h3>
              <div className="mt-6 space-y-3">
                {analytics.topSources.length === 0 ? (
                  <p className="text-sm text-muted">No monitoring labels captured yet.</p>
                ) : (
                  analytics.topSources.map((source, index) => (
                    <div
                      key={`${source.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-border bg-base/50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold">{source.name}</span>
                      <span className="text-xs text-muted">{source.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">
                    Historical analytics
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">MTTR, MTTA, frequency</h3>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-muted">
                  Based on active alerts
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-base/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">MTTA (proxy)</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {formatDuration(analytics.meanDuration)}
                  </p>
                  <p className="mt-2 text-xs text-muted">Average alert age.</p>
                </div>
                <div className="rounded-2xl border border-border bg-base/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">MTTR (proxy)</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {formatDuration(analytics.medianDuration)}
                  </p>
                  <p className="mt-2 text-xs text-muted">Median alert age.</p>
                </div>
                <div className="rounded-2xl border border-border bg-base/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Incident frequency</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {analytics.frequency7d.total.toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    Last 7d avg {analytics.frequency7d.average.toFixed(1)}/day.
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-base/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Busiest day</p>
                  <p className="mt-3 text-2xl font-semibold">
                    {analytics.frequency30d.busiest.count}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {analytics.frequency30d.busiest.date} in the last 30d.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Top noisy sources</p>
              <h3 className="mt-2 text-2xl font-semibold">Noisiest alert names</h3>
              <div className="mt-6 space-y-3">
                {analytics.topNoisyAlerts.length === 0 ? (
                  <p className="text-sm text-muted">No alert noise recorded yet.</p>
                ) : (
                  analytics.topNoisyAlerts.map((alert, index) => (
                    <div
                      key={`${alert.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-border bg-base/50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold">{alert.name}</span>
                      <span className="text-xs text-muted">{alert.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Team dashboards</p>
                <h3 className="mt-2 text-2xl font-semibold">Team-level snapshots</h3>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted">
                Source-based grouping
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {analytics.teamStats.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl border border-border bg-base/60 p-5"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{team.name}</p>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-semibold">{team.total}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted">Alerts</span>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    <div className="flex items-center justify-between">
                      <span>Critical</span>
                      <span className="font-semibold">{team.critical}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Top label</span>
                      <span className="font-semibold">{team.topLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last seen</span>
                      <span className="font-semibold">
                        {team.lastSeen
                          ? new Date(team.lastSeen).toLocaleTimeString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-surface/90 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Detailed Report</p>
                <h3 className="mt-1 text-xl font-semibold">Alert log</h3>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted">
                Showing {alerts.length} alerts
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Instance label</th>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Host</th>
                  <th className="px-4 py-3 text-left">Alert</th>
                  <th className="px-4 py-3 text-left">Event time</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                      No alerts available yet.
                    </td>
                  </tr>
                ) : (
                  alerts.map((alert) => (
                    <tr key={alert.id} className="border-t border-border bg-surface/80">
                      <td className="px-4 py-3 font-semibold">
                        {alert.sourceLabel || alert.source}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            alert.severity === "critical"
                              ? "rounded-full bg-red-500/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red-500"
                              : alert.severity === "warning"
                                ? "rounded-full bg-yellow-400/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-yellow-600"
                                : "rounded-full bg-emerald-400/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-500"
                          }
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{alert.instance || "-"}</td>
                      <td className="px-4 py-3">{alert.name}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
