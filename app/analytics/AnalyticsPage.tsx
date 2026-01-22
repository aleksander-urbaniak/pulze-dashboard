"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "../../components/Sidebar";
import {
  buildAnalyticsSummary,
  buildMonthOptions,
  buildTrendData,
  getMonthValue,
  type AnalyticsSummary,
  type TrendRange
} from "../../lib/analytics";
import type { Alert, Settings, User } from "../../lib/types";
import { trendRanges, trendStorageKey } from "./constants";
import { formatDelta } from "./utils";
import AnalyticsHeader from "./components/AnalyticsHeader";
import AnalyticsStatCards from "./components/AnalyticsStatCards";
import AlertTrendSection from "./components/AlertTrendSection";
import TopSourcesCard from "./components/TopSourcesCard";
import HistoricalAnalyticsCard from "./components/HistoricalAnalyticsCard";
import NoisyAlertsCard from "./components/NoisyAlertsCard";
import TeamSnapshots from "./components/TeamSnapshots";
import AlertLogTable from "./components/AlertLogTable";

type UserResponse = { user: User };
type AlertResponse = { alerts: Alert[]; errors: Array<{ source: string; message: string }> };
type AlertLogResponse = { alerts: Alert[]; total: number; page: number; pageSize: number };

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertLogEntries, setAlertLogEntries] = useState<Alert[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Array<{ source: string; message: string }>>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>("14d");
  const [trendMonth, setTrendMonth] = useState(() => getMonthValue(new Date()));
  const [alertLogPageSize, setAlertLogPageSize] = useState(25);
  const [alertLogPage, setAlertLogPage] = useState(1);
  const [alertLogTotal, setAlertLogTotal] = useState(0);
  const [alertLogQuery, setAlertLogQuery] = useState("");

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(trendStorageKey);
    } catch {
      saved = null;
    }
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved) as Partial<{ range: TrendRange; month: string }>;
      if (parsed.range && trendRanges.some((range) => range.value === parsed.range)) {
        setTrendRange(parsed.range);
      }
      if (parsed.month && typeof parsed.month === "string") {
        setTrendMonth(parsed.month);
      }
    } catch {
      window.localStorage.removeItem(trendStorageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload = JSON.stringify({ range: trendRange, month: trendMonth });
    try {
      window.localStorage.setItem(trendStorageKey, payload);
    } catch {
      // Ignore storage failures and fall back to defaults.
    }
  }, [trendRange, trendMonth]);

  useEffect(() => {
    if (user) {
      void loadAlerts();
      void loadAnalyticsSummary();
      void loadSettings();
    }
  }, [user]);

  const alertLogPageCount = Math.max(1, Math.ceil(alertLogTotal / alertLogPageSize));
  const alertLogPageSafe = Math.min(alertLogPage, alertLogPageCount);
  const alertLogSlice = alertLogEntries;

  useEffect(() => {
    setAlertLogPage(1);
  }, [alertLogPageSize, alertLogQuery]);

  useEffect(() => {
    if (alertLogPage > alertLogPageCount) {
      setAlertLogPage(alertLogPageCount);
    }
  }, [alertLogPage, alertLogPageCount]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void loadAlertLog();
  }, [user, alertLogPage, alertLogPageSize, alertLogQuery]);

  const analytics = useMemo(
    () => analyticsSummary ?? buildAnalyticsSummary(alerts),
    [alerts, analyticsSummary]
  );

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
          <path d="M12 7v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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
          <path d="M14 8h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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

  async function loadAlertLog() {
    const query = new URLSearchParams({
      page: String(alertLogPage),
      pageSize: String(alertLogPageSize),
      query: alertLogQuery
    });
    const response = await fetch(`/api/alerts/log?${query.toString()}`);
    if (!response.ok) {
      setAlertLogEntries([]);
      return;
    }
    const data = (await response.json()) as AlertLogResponse & {
      total: number;
    };
    setAlertLogEntries(data.alerts ?? []);
    setAlertLogTotal(data.total ?? 0);
  }

  async function loadAnalyticsSummary() {
    const response = await fetch("/api/analytics/summary");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { summary: AnalyticsSummary };
    if (data.summary) {
      setAnalyticsSummary(data.summary);
    }
  }

  async function loadSettings() {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { settings: Settings };
    setSettings(data.settings);
  }

  function getAlertSourceUrl(alert: Alert) {
    if (!settings) {
      return null;
    }
    const label = alert.sourceLabel?.trim() ?? "";
    if (alert.source === "Prometheus") {
      const match = settings.prometheusSources.find((source) =>
        label ? source.name.trim() === label : Boolean(source.url)
      );
      return match?.url ?? null;
    }
    if (alert.source === "Zabbix") {
      const match = settings.zabbixSources.find((source) =>
        label ? source.name.trim() === label : Boolean(source.url)
      );
      return match?.url ?? null;
    }
    if (alert.source === "Kuma") {
      const match = settings.kumaSources.find((source) =>
        label ? source.name.trim() === label : Boolean(source.baseUrl)
      );
      return match?.baseUrl ?? null;
    }
    return null;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-surface/90 px-4 py-3 text-sm text-muted shadow-card sm:px-6 sm:py-4">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
          <AnalyticsHeader
            isLoadingAlerts={isLoadingAlerts}
            onRefresh={() => {
              void loadAlerts();
              void loadAlertLog();
              void loadAnalyticsSummary();
            }}
          />

          {errors.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {errors.map((error) => `${error.source}: ${error.message}`).join(" | ")}
            </div>
          ) : null}

          <AnalyticsStatCards statCards={statCards} />

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <AlertTrendSection
              trendRange={trendRange}
              onTrendRangeChange={setTrendRange}
              trendMonth={trendMonth}
              onTrendMonthChange={setTrendMonth}
              monthOptions={monthOptions}
              alertsCount={alerts.length}
              trendData={trendData}
              counts={analytics.counts}
            />
            <TopSourcesCard sources={analytics.topSources} />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <HistoricalAnalyticsCard analytics={analytics} />
            <NoisyAlertsCard alerts={analytics.topNoisyAlerts} />
          </div>

          <TeamSnapshots teamStats={analytics.teamStats} />

          <AlertLogTable
            alertLogSlice={alertLogSlice}
            alertLogQuery={alertLogQuery}
            onQueryChange={setAlertLogQuery}
            alertLogTotal={alertLogTotal}
            alertLogPageSize={alertLogPageSize}
            alertLogPageSafe={alertLogPageSafe}
            alertLogPageCount={alertLogPageCount}
            onPageSizeChange={(value) => {
              setAlertLogPageSize(value);
              setAlertLogPage(1);
            }}
            onPrevPage={() => setAlertLogPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setAlertLogPage((prev) => Math.min(alertLogPageCount, prev + 1))}
            getAlertSourceUrl={getAlertSourceUrl}
          />
        </main>
      </div>
    </div>
  );
}
