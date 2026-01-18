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

    alerts.forEach((alert) => {
      const ts = new Date(alert.timestamp);
      if (Number.isNaN(ts.getTime())) {
        return;
      }
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
    });

    const topSources = Array.from(traffic.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return { counts, topSources };
  }, [alerts]);

  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const trendData = useMemo(
    () => buildTrendData(alerts, trendRange, trendMonth),
    [alerts, trendRange, trendMonth]
  );

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
