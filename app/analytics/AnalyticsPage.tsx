"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppSession } from "../../lib/app-session";
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

type AlertResponse = { alerts: Alert[]; errors: Array<{ source: string; message: string }> };
type AlertLogResponse = { alerts: Alert[]; total: number; page: number; pageSize: number };

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, settings } = useAppSession();
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertLogEntries, setAlertLogEntries] = useState<Alert[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [errors, setErrors] = useState<Array<{ source: string; message: string }>>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [trendRange, setTrendRange] = useState<TrendRange>("14d");
  const [trendMonth, setTrendMonth] = useState(() => getMonthValue(new Date()));
  const [alertLogPageSize, setAlertLogPageSize] = useState(25);
  const [alertLogPage, setAlertLogPage] = useState(1);
  const [alertLogTotal, setAlertLogTotal] = useState(0);
  const [alertLogQuery, setAlertLogQuery] = useState("");

  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

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

  const loadAlerts = useCallback(async () => {
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
  }, []);

  const loadAnalyticsSummary = useCallback(async () => {
    const response = await fetch("/api/analytics/summary");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { summary: AnalyticsSummary };
    if (data.summary) {
      setAnalyticsSummary(data.summary);
    }
  }, []);

  const loadAlertLog = useCallback(async () => {
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
  }, [alertLogPage, alertLogPageSize, alertLogQuery]);

  useEffect(() => {
    if (user) {
      void loadAlerts();
      void loadAnalyticsSummary();
    }
  }, [user, loadAlerts, loadAnalyticsSummary]);

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
  }, [user, loadAlertLog]);

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
      color: "text-rose-300",
      bg: "bg-rose-500/15",
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
      color: "text-amber-300",
      bg: "bg-amber-500/15",
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
      color: "text-cyan-300",
      bg: "bg-cyan-500/15",
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
      color: "text-emerald-300",
      bg: "bg-emerald-500/15",
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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="rounded-xl border border-[#c3d4e8] bg-white px-4 py-3 text-sm text-[#60748e] shadow-[0_16px_34px_-26px_rgba(8,30,64,0.28)] dark:border-[#1b2f4d] dark:bg-[#060f1f]/88 dark:text-slate-400 dark:shadow-card sm:px-6 sm:py-4">
          Loading analytics...
        </div>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen border-l border-[rgb(var(--app-divider)/0.82)] bg-[rgb(var(--app-main-bg))] px-4 pb-6 pt-2 sm:px-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1520px]">
        <AnalyticsHeader
          user={user}
          settings={settings}
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => {
              void loadAlerts();
              void loadAlertLog();
              void loadAnalyticsSummary();
            }}
            className="btn-unified btn-unified-primary h-10 px-4"
          >
            {isLoadingAlerts ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {errors.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {errors.map((error) => `${error.source}: ${error.message}`).join(" | ")}
          </div>
        ) : null}

        <AnalyticsStatCards statCards={statCards} />

        <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
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
      </div>
    </main>
  );
}
