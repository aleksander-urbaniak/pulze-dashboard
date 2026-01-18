"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import ThemeToggle from "../components/ThemeToggle";
import Sidebar from "../components/Sidebar";
import AlertChart from "../components/AlertChart";
import {
  buildMonthOptions,
  buildTrendData,
  getMonthValue,
  type TrendRange
} from "../lib/analytics";
import type { Alert, Settings, User } from "../lib/types";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30
};

const sourceOptions = ["All", "Prometheus", "Zabbix", "Kuma"] as const;
const severityOptions = ["All", "critical", "warning", "info"] as const;
const trendRanges: Array<{ value: TrendRange; label: string }> = [
  { value: "1d", label: "1D" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "month", label: "Month" },
  { value: "year", label: "Last year" }
];

type ApiError = { source: string; message: string };

type AlertResponse = { alerts: Alert[]; errors: ApiError[] };

type SettingsResponse = { settings: Settings; canEdit: boolean };

type UserResponse = { user: User };

type BootstrapResponse = { needsSetup: boolean };

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

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<(typeof sourceOptions)[number]>("All");
  const [filterSeverity, setFilterSeverity] = useState<(typeof severityOptions)[number]>("All");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [trendRange, setTrendRange] = useState<TrendRange>("14d");
  const [trendMonth, setTrendMonth] = useState(() => getMonthValue(new Date()));
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [setupForm, setSetupForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatarUrl: "",
    password: ""
  });
  const [setupError, setSetupError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const lastAlertIdsRef = useRef<Set<string> | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!notificationsRef.current) {
        return;
      }
      if (!notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (user) {
      void loadSettings();
      void loadAlerts();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !settings.refreshInterval) {
      return;
    }
    const interval = Math.max(5, settings.refreshInterval) * 1000;
    const timer = setInterval(() => {
      void loadAlerts();
    }, interval);
    return () => clearInterval(timer);
  }, [user, settings.refreshInterval]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchSearch =
        alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.instance ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchSource = filterSource === "All" || alert.source === filterSource;
      const matchSeverity = filterSeverity === "All" || alert.severity === filterSeverity;
      return matchSearch && matchSource && matchSeverity;
    });
  }, [alerts, searchTerm, filterSource, filterSeverity]);

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
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { counts, topSources };
  }, [alerts]);

  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const trendData = useMemo(
    () => buildTrendData(alerts, trendRange, trendMonth),
    [alerts, trendRange, trendMonth]
  );

  async function checkSetup() {
    const response = await fetch("/api/auth/bootstrap");
    if (!response.ok) {
      setNeedsSetup(false);
      return;
    }
    const data = (await response.json()) as BootstrapResponse;
    setNeedsSetup(Boolean(data.needsSetup));
  }

  async function loadSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setUser(null);
      lastAlertIdsRef.current = null;
      setNewAlertCount(0);
      setNotifications([]);
      setIsNotificationsOpen(false);
      await checkSetup();
      setIsCheckingSetup(false);
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setIsCheckingSetup(false);
  }

  async function loadSettings() {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as SettingsResponse;
    setSettings(data.settings);
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
    const currentIds = new Set(data.alerts.map((alert) => alert.id));
    if (lastAlertIdsRef.current) {
      const newAlerts = data.alerts.filter((alert) => !lastAlertIdsRef.current?.has(alert.id));
      if (newAlerts.length > 0) {
        setNewAlertCount((count) => count + newAlerts.length);
        setNotifications((prev) => [...newAlerts, ...prev].slice(0, 20));
      }
    }
    lastAlertIdsRef.current = currentIds;
    setIsLoadingAlerts(false);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm)
    });
    if (!response.ok) {
      const data = await response.json();
      setLoginError(data.error ?? "Login failed");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setNeedsSetup(false);
    setLoginForm({ username: "", password: "" });
  }

  async function handleSetup(event: React.FormEvent) {
    event.preventDefault();
    setSetupError(null);
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setupForm)
    });
    if (!response.ok) {
      const data = await response.json();
      setSetupError(data.error ?? "Setup failed");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setNeedsSetup(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setNeedsSetup(false);
    setIsCheckingSetup(true);
    lastAlertIdsRef.current = null;
    setNewAlertCount(0);
    setNotifications([]);
    setIsNotificationsOpen(false);
    await checkSetup();
    setIsCheckingSetup(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-4xl rounded-3xl border border-border bg-surface/90 p-10 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface/90 shadow-card">
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                  <path
                    d="M4 16h6l3-6 6 12 3-6h6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted">PulZe</p>
                <h1 className="text-3xl font-semibold">
                  {needsSetup ? "Welcome to PulZe" : "Monitoring Login"}
                </h1>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {isCheckingSetup ? (
            <p className="mt-6 text-sm text-muted">Checking setup status...</p>
          ) : needsSetup ? (
            <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Overview</p>
                <h2 className="mt-2 text-2xl font-semibold">Unified monitoring in one place</h2>
                <ul className="mt-4 space-y-3 text-sm text-muted">
                  <li>Aggregate alerts from Prometheus, Zabbix, and Uptime Kuma.</li>
                  <li>Filter, search, and refresh automatically on the dashboard.</li>
                  <li>Manage users, permissions, and data sources centrally.</li>
                </ul>
                <p className="mt-6 text-sm text-muted">
                  Create the first admin account to finish setup.
                </p>
              </div>
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={setupForm.firstName}
                    onChange={(event) =>
                      setSetupForm({ ...setupForm, firstName: event.target.value })
                    }
                    placeholder="First name"
                    className="rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                  />
                  <input
                    value={setupForm.lastName}
                    onChange={(event) =>
                      setSetupForm({ ...setupForm, lastName: event.target.value })
                    }
                    placeholder="Last name"
                    className="rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                  />
                </div>
                <input
                  value={setupForm.username}
                  onChange={(event) => setSetupForm({ ...setupForm, username: event.target.value })}
                  placeholder="Username"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
                <input
                  value={setupForm.email}
                  onChange={(event) => setSetupForm({ ...setupForm, email: event.target.value })}
                  placeholder="Email"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
                <input
                  value={setupForm.avatarUrl}
                  onChange={(event) => setSetupForm({ ...setupForm, avatarUrl: event.target.value })}
                  placeholder="Avatar URL (optional)"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
                <input
                  type="password"
                  value={setupForm.password}
                  onChange={(event) => setSetupForm({ ...setupForm, password: event.target.value })}
                  placeholder="Password"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
                {setupError ? <p className="text-sm text-red-500">{setupError}</p> : null}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-card"
                >
                  Create Admin Account
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="mt-8 max-w-md space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted">Username</label>
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-muted">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {loginError ? <p className="text-sm text-red-500">{loginError}</p> : null}
              <button
                type="submit"
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-card"
              >
                Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const comparisonRows = [
    { label: "Day", last: analytics.counts.lastDay, current: analytics.counts.currentDay },
    { label: "Month", last: analytics.counts.lastMonth, current: analytics.counts.currentMonth },
    { label: "Year", last: analytics.counts.lastYear, current: analytics.counts.currentYear }
  ];
  const activeDelta = formatDelta(filteredAlerts.length, analytics.counts.lastDay);
  const dayDelta = formatDelta(analytics.counts.currentDay, analytics.counts.lastDay);
  const monthDelta = formatDelta(analytics.counts.currentMonth, analytics.counts.lastMonth);
  const yearDelta = formatDelta(analytics.counts.currentYear, analytics.counts.lastYear);
  const statCards = [
    {
      id: "active",
      title: "Active Alerts",
      value: filteredAlerts.length.toLocaleString(),
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
  const topSourceMax = Math.max(1, ...analytics.topSources.map((source) => source.count));

  return (
    <div className="min-h-screen flex bg-base">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1">
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Dashboard</p>
              <h2 className="text-2xl font-semibold">Monitoring Overview</h2>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <div className="relative w-full max-w-xs">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M20 20l-3.5-3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search alerts..."
                  className="w-full rounded-xl border border-border bg-base/60 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((open) => !open);
                    setNewAlertCount(0);
                  }}
                  className="relative rounded-full border border-border bg-surface/80 p-2"
                  aria-label="Notifications"
                  title={newAlertCount > 0 ? `${newAlertCount} new alerts` : "No new alerts"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 9a6 6 0 1 1 12 0c0 3.2 1.2 4.6 2 5.4H4c.8-.8 2-2.2 2-5.4Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 19a2.5 2.5 0 0 0 5 0"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  {newAlertCount > 0 ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                  ) : null}
                </button>
                {isNotificationsOpen ? (
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Notifications</p>
                      {notifications.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications([]);
                            setNewAlertCount(0);
                          }}
                          className="text-xs uppercase tracking-[0.2em] text-muted"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="mt-3 text-sm text-muted">No new alerts yet.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {notifications.map((alert) => (
                          <div
                            key={`notify-${alert.id}`}
                            className="rounded-xl border border-border bg-base/60 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{alert.name}</span>
                              <span
                                className={clsx(
                                  "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                                  alert.severity === "critical"
                                    ? "bg-red-500/15 text-red-500"
                                    : alert.severity === "warning"
                                      ? "bg-yellow-400/20 text-yellow-600"
                                      : "bg-emerald-400/15 text-emerald-500"
                                )}
                              >
                                {alert.severity}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs text-muted">
                              <span>{alert.sourceLabel || alert.source}</span>
                              <span>{new Date(alert.timestamp).toLocaleString()}</span>
                            </div>
                            {alert.instance ? (
                              <p className="mt-1 text-xs text-muted">{alert.instance}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="rounded-full border border-border bg-surface/80 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                Hello, {user.firstName}!
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Active Alerts</p>
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-3xl font-semibold">{filteredAlerts.length}</h3>
                <span className="text-sm text-muted">Auto refresh {settings.refreshInterval}s</span>
              </div>
              {errors.length > 0 ? (
                <div className="mt-2 text-sm text-red-500">
                  {errors.map((error) => `${error.source}: ${error.message}`).join(" | ")}
                </div>
              ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterSource}
                onChange={(event) => setFilterSource(event.target.value as (typeof sourceOptions)[number])}
                className="rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
              >
                {sourceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={filterSeverity}
                onChange={(event) =>
                  setFilterSeverity(event.target.value as (typeof severityOptions)[number])
                }
                className="rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
              >
                {severityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadAlerts()}
                className="rounded-xl border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
              >
                {isLoadingAlerts ? "Refreshing" : "Refresh"}
              </button>
            </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                      card.trend === "up"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    )}
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

          <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Alert Trendline</h3>
                  <p className="text-sm text-muted">Monitor alert volume over time.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {trendRanges.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => setTrendRange(range.value)}
                      className={clsx(
                        "rounded-lg border px-3 py-1 text-xs uppercase tracking-[0.2em]",
                        trendRange === range.value
                          ? "border-accent bg-accent text-white"
                          : "border-border text-muted"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                  {trendRange === "month" ? (
                    <select
                      value={trendMonth}
                      onChange={(event) => setTrendMonth(event.target.value)}
                      className="rounded-lg border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em]"
                    >
                      {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>
              <AlertChart data={trendData} />
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-2xl border border-border bg-base/60 p-4"
                  >
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

            <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Top Instances</h3>
                  <p className="text-sm text-muted">Most active monitoring labels.</p>
                </div>
                <Link
                  href="/analytics"
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  View Report
                </Link>
              </div>
              <div className="mt-6 space-y-4">
                {analytics.topSources.length === 0 ? (
                  <p className="text-sm text-muted">No monitoring labels captured yet.</p>
                ) : (
                  analytics.topSources.map((source, index) => (
                    <div key={`${source.name}-${index}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{source.name}</span>
                        <span className="text-muted">{source.count}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-base/60">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{
                            width: `${Math.round((source.count / topSourceMax) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/analytics"
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted"
              >
                View Detailed Report
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Alerts</p>
              <h3 className="text-xl font-semibold">Latest activity</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-base/60 p-1 text-xs uppercase tracking-[0.2em]">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={clsx(
                    "rounded-full px-3 py-1",
                    viewMode === "cards" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={clsx(
                    "rounded-full px-3 py-1",
                    viewMode === "table" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Table
                </button>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted">
                Showing {filteredAlerts.length}
              </span>
            </div>
          </div>

          {viewMode === "cards" ? (
            <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredAlerts.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-border bg-base/40 p-8 text-center text-sm text-muted">
                  No alerts match your filters.
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={clsx(
                      "relative rounded-2xl border border-border bg-base/40 p-5",
                      alert.severity === "critical"
                        ? "border-l-4 border-l-red-500"
                        : alert.severity === "warning"
                          ? "border-l-4 border-l-yellow-400"
                          : "border-l-4 border-l-emerald-400"
                    )}
                  >
                    <span className="absolute right-4 top-4 rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
                      {alert.source}
                    </span>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">{alert.severity}</p>
                    <h3 className="mt-3 text-lg font-semibold">{alert.name}</h3>
                    {alert.instance ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted">
                        {alert.instance}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm text-muted">{alert.message}</p>
                    <p className="mt-6 text-xs text-muted">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-card">
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
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-muted"
                      >
                        No alerts match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className="border-t border-border bg-base/40"
                      >
                        <td className="px-4 py-3 font-semibold">
                          {alert.sourceLabel || alert.source}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]",
                              alert.severity === "critical"
                                ? "bg-red-500/15 text-red-500"
                                : alert.severity === "warning"
                                  ? "bg-yellow-400/20 text-yellow-600"
                                  : "bg-emerald-400/15 text-emerald-500"
                            )}
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
          )}
        </main>
      </div>
    </div>
  );
}
