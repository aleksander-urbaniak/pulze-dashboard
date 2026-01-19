"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import ThemeToggle from "../components/ThemeToggle";
import Sidebar from "../components/Sidebar";
import { defaultAppearance } from "../lib/appearance";
import type { Alert, SavedView, SavedViewFilters, Settings, User } from "../lib/types";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

const sourceOptions = ["All", "Prometheus", "Zabbix", "Kuma"] as const;
const severityOptions = ["All", "critical", "warning", "info"] as const;
const timeRangeOptions = [
  { value: "all", label: "All time" },
  { value: "1h", label: "Last hour" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" }
] as const;

type ApiError = { source: string; message: string };

type AlertResponse = { alerts: Alert[]; errors: ApiError[] };

type SettingsResponse = { settings: Settings; canEdit: boolean };

type UserResponse = { user: User };

type BootstrapResponse = { needsSetup: boolean };

type SavedViewsResponse = { views: SavedView[] };

type SavedViewResponse = { view: SavedView };

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTags, setFilterTags] = useState("");
  const [filterSource, setFilterSource] = useState<(typeof sourceOptions)[number]>("All");
  const [filterSeverity, setFilterSeverity] = useState<(typeof severityOptions)[number]>("All");
  const [filterTimeRange, setFilterTimeRange] =
    useState<(typeof timeRangeOptions)[number]["value"]>("24h");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "split">("cards");
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [viewName, setViewName] = useState("");
  const [viewStatus, setViewStatus] = useState<string | null>(null);
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
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [alertNoteDraft, setAlertNoteDraft] = useState("");
  const lastAlertIdsRef = useRef<Set<string> | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearchTerm("");
        setFilterTags("");
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (user) {
      void loadSettings();
      void loadAlerts();
      void loadSavedViews();
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
    const now = Date.now();
    const timeLimit =
      filterTimeRange === "1h"
        ? now - 60 * 60 * 1000
        : filterTimeRange === "24h"
          ? now - 24 * 60 * 60 * 1000
          : filterTimeRange === "7d"
            ? now - 7 * 24 * 60 * 60 * 1000
            : filterTimeRange === "30d"
              ? now - 30 * 24 * 60 * 60 * 1000
              : null;
    const tags = filterTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    return alerts.filter((alert) => {
      const matchSearch =
        alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.instance ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchTags =
        tags.length === 0 ||
        tags.every((tag) => {
          return (
            alert.name.toLowerCase().includes(tag) ||
            alert.message.toLowerCase().includes(tag) ||
            (alert.instance ?? "").toLowerCase().includes(tag) ||
            (alert.sourceLabel ?? alert.source).toLowerCase().includes(tag)
          );
        });
      const matchSource = filterSource === "All" || alert.source === filterSource;
      const matchSeverity = filterSeverity === "All" || alert.severity === filterSeverity;
      const matchTime =
        !timeLimit || new Date(alert.timestamp).getTime() >= timeLimit;
      return matchSearch && matchTags && matchSource && matchSeverity && matchTime;
    });
  }, [alerts, searchTerm, filterTags, filterSource, filterSeverity, filterTimeRange]);

  useEffect(() => {
    if (filteredAlerts.length === 0) {
      setSelectedAlertId(null);
      return;
    }
    if (!selectedAlertId || !filteredAlerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(filteredAlerts[0].id);
    }
  }, [filteredAlerts, selectedAlertId]);

  useEffect(() => {
    const current = filteredAlerts.find((alert) => alert.id === selectedAlertId);
    setAlertNoteDraft(current?.ackNote ?? "");
  }, [filteredAlerts, selectedAlertId]);

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
      setSavedViews([]);
      setSelectedViewId(null);
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

  async function loadSavedViews() {
    const response = await fetch("/api/views");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as SavedViewsResponse;
    setSavedViews(data.views ?? []);
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

  function getCurrentFilters(): SavedViewFilters {
    return {
      searchTerm,
      filterTags,
      filterSource,
      filterSeverity,
      filterTimeRange,
      viewMode
    };
  }

  function applySavedView(view: SavedView) {
    setSearchTerm(view.filters.searchTerm);
    setFilterTags(view.filters.filterTags);
    setFilterSource(view.filters.filterSource);
    setFilterSeverity(view.filters.filterSeverity);
    setFilterTimeRange(view.filters.filterTimeRange);
    setViewMode(view.filters.viewMode);
    setSelectedViewId(view.id);
    setViewStatus(null);
  }

  async function handleSaveView() {
    const name = viewName.trim();
    if (!name) {
      setViewStatus("View name required.");
      return;
    }
    const response = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, filters: getCurrentFilters() })
    });
    if (!response.ok) {
      const data = await response.json();
      setViewStatus(data.error ?? "Failed to save view.");
      return;
    }
    const data = (await response.json()) as SavedViewResponse;
    setSavedViews((prev) => [data.view, ...prev]);
    setSelectedViewId(data.view.id);
    setViewName("");
    setViewStatus("View saved.");
  }

  async function handleDeleteView(id: string) {
    const response = await fetch("/api/views", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!response.ok) {
      const data = await response.json();
      setViewStatus(data.error ?? "Failed to delete view.");
      return;
    }
    setSavedViews((prev) => prev.filter((view) => view.id !== id));
    if (selectedViewId === id) {
      setSelectedViewId(null);
    }
    setViewStatus("View deleted.");
  }

  async function updateAlertState(alertId: string, status: "active" | "acknowledged" | "resolved") {
    const response = await fetch("/api/alerts/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, status, note: alertNoteDraft })
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as {
      state: {
        alertId: string;
        status: "active" | "acknowledged" | "resolved";
        note: string;
        updatedAt: string;
        updatedBy: string | null;
        acknowledgedAt: string | null;
        resolvedAt: string | null;
      };
    };
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === data.state.alertId
          ? {
              ...alert,
              ackStatus: data.state.status,
              ackNote: data.state.note,
              ackUpdatedAt: data.state.updatedAt,
              ackUpdatedBy: data.state.updatedBy ?? undefined,
              acknowledgedAt: data.state.acknowledgedAt ?? undefined,
              resolvedAt: data.state.resolvedAt ?? undefined
            }
          : alert
      )
    );
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
    setSavedViews([]);
    setSelectedViewId(null);
    await checkSetup();
    setIsCheckingSetup(false);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-4xl rounded-3xl border border-border bg-surface/90 p-10 shadow-card backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3">
              <span className="brand-logo flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface/90 shadow-card">
                <span className="brand-logo__image" />
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="brand-logo__fallback">
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
                <div className="mt-6 rounded-2xl border border-border bg-base/50 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Setup checklist</p>
                  <ol className="mt-4 space-y-2 text-sm text-muted">
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                        1
                      </span>
                      Create your admin account.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                        2
                      </span>
                      Connect data sources in Settings.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                        3
                      </span>
                      Invite teammates and assign roles.
                    </li>
                  </ol>
                </div>
                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Data source guides</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-base/50 p-4">
                      <p className="text-sm font-semibold">Prometheus + Alertmanager</p>
                      <p className="mt-2 text-xs text-muted">
                        Add the base URL, and PulZe will pull `/api/v2/alerts`.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-base/50 p-4">
                      <p className="text-sm font-semibold">Zabbix</p>
                      <p className="mt-2 text-xs text-muted">
                        Use the base URL and API token for JSON-RPC access.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-base/50 p-4 sm:col-span-2">
                      <p className="text-sm font-semibold">Uptime Kuma</p>
                      <p className="mt-2 text-xs text-muted">
                        Choose status page mode or API key mode and provide the slug.
                      </p>
                    </div>
                  </div>
                </div>
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

  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId) ?? null;
  const selectedAlertStatus = selectedAlert?.ackStatus ?? "active";

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
                  ref={searchInputRef}
                  placeholder="Search alerts..."
                  aria-label="Search alerts"
                  className="w-full rounded-xl border border-border bg-base/60 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div ref={notificationsRef} className="relative z-40">
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
                  <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur z-50">
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

          <div className="sticky top-4 z-30 mt-6 rounded-2xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedViewId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    const view = savedViews.find((item) => item.id === value);
                    if (view) {
                      applySavedView(view);
                    } else {
                      setSelectedViewId(null);
                    }
                  }}
                  className="min-w-[180px] rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                  aria-label="Saved views"
                >
                  <option value="">Saved views</option>
                  {savedViews.map((view) => (
                    <option key={view.id} value={view.id}>
                      {view.name}
                    </option>
                  ))}
                </select>
                <input
                  value={viewName}
                  onChange={(event) => setViewName(event.target.value)}
                  placeholder="Save current view"
                  aria-label="Save current view"
                  className="min-w-[200px] flex-1 rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveView}
                  className="rounded-xl border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                >
                  Save
                </button>
                {selectedViewId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteView(selectedViewId)}
                    className="rounded-xl border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filterTimeRange}
                  onChange={(event) =>
                    setFilterTimeRange(
                      event.target.value as (typeof timeRangeOptions)[number]["value"]
                    )
                  }
                  className="rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                  aria-label="Time range filter"
                >
                  {timeRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSource}
                  onChange={(event) =>
                    setFilterSource(event.target.value as (typeof sourceOptions)[number])
                  }
                  className="rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                  aria-label="Source filter"
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
                  aria-label="Severity filter"
                >
                  {severityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  value={filterTags}
                  onChange={(event) => setFilterTags(event.target.value)}
                  placeholder="Tags (comma-separated)"
                  aria-label="Tag filter"
                  className="min-w-[220px] flex-1 rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                />
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {viewStatus ? (
                  <span className="text-xs uppercase tracking-[0.2em] text-muted">{viewStatus}</span>
                ) : null}
                <span className="text-xs uppercase tracking-[0.2em] text-muted">
                  Auto refresh {settings.refreshInterval}s
                </span>
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

          <div className="mt-6 rounded-2xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Active Alerts</p>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-3xl font-semibold">{filteredAlerts.length}</h3>
                  <span className="text-sm text-muted">
                    {filterTimeRange === "all" ? "All time" : "Filtered"}
                  </span>
                </div>
                {errors.length > 0 ? (
                  <div className="mt-2 text-sm text-red-500">
                    {errors.map((error) => `${error.source}: ${error.message}`).join(" | ")}
                  </div>
                ) : null}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted">
                Press <span className="font-semibold">/</span> to search, Esc to clear
              </div>
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
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={clsx(
                    "rounded-full px-3 py-1",
                    viewMode === "split" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Split
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
                    {alert.ackStatus && alert.ackStatus !== "active" ? (
                      <span
                        className={clsx(
                          "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                          alert.ackStatus === "acknowledged"
                            ? "bg-blue-500/15 text-blue-600"
                            : "bg-slate-500/15 text-slate-600"
                        )}
                      >
                        {alert.ackStatus}
                      </span>
                    ) : null}
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
          ) : viewMode === "table" ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Instance label</th>
                    <th className="px-4 py-3 text-left">Severity</th>
                    <th className="px-4 py-3 text-left">State</th>
                    <th className="px-4 py-3 text-left">Host</th>
                    <th className="px-4 py-3 text-left">Alert</th>
                    <th className="px-4 py-3 text-left">Event time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                        No alerts match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="border-t border-border bg-base/40">
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
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em]",
                              alert.ackStatus === "acknowledged"
                                ? "bg-blue-500/15 text-blue-600"
                                : alert.ackStatus === "resolved"
                                  ? "bg-slate-500/15 text-slate-600"
                                  : "bg-emerald-400/15 text-emerald-500"
                            )}
                          >
                            {alert.ackStatus ?? "active"}
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
          ) : (
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Alert list</p>
                  <span className="text-xs uppercase tracking-[0.2em] text-muted">
                    {filteredAlerts.length} results
                  </span>
                </div>
                {filteredAlerts.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-border bg-base/40 p-6 text-center text-sm text-muted">
                    No alerts match your filters.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {filteredAlerts.map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => setSelectedAlertId(alert.id)}
                        className={clsx(
                          "w-full rounded-xl border px-4 py-3 text-left transition",
                          selectedAlertId === alert.id
                            ? "border-accent bg-accent/10"
                            : "border-border bg-base/40 hover:border-accent/40"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{alert.name}</span>
                          <div className="flex items-center gap-2">
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
                            {alert.ackStatus && alert.ackStatus !== "active" ? (
                              <span
                                className={clsx(
                                  "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                                  alert.ackStatus === "acknowledged"
                                    ? "bg-blue-500/15 text-blue-600"
                                    : "bg-slate-500/15 text-slate-600"
                                )}
                              >
                                {alert.ackStatus}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted">
                          <span>{alert.sourceLabel || alert.source}</span>
                          <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {alert.instance ? (
                          <p className="mt-2 text-xs text-muted">{alert.instance}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Alert detail</p>
                  {selectedAlert ? (
                    <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
                      {selectedAlert.source}
                    </span>
                  ) : null}
                </div>
                {selectedAlert ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted">
                        {selectedAlert.severity}
                      </p>
                      <h3 className="mt-2 text-2xl font-semibold">{selectedAlert.name}</h3>
                      {selectedAlert.instance ? (
                        <p className="mt-1 text-sm text-muted">{selectedAlert.instance}</p>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted">{selectedAlert.message}</p>
                    <div className="rounded-xl border border-border bg-base/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">Status</p>
                          <p className="mt-2 text-sm font-semibold capitalize">
                            {selectedAlertStatus}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateAlertState(selectedAlert.id, "acknowledged")}
                            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                          >
                            Acknowledge
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAlertState(selectedAlert.id, "resolved")}
                            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                          >
                            Resolve
                          </button>
                          {selectedAlertStatus !== "active" ? (
                            <button
                              type="button"
                              onClick={() => updateAlertState(selectedAlert.id, "active")}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                            >
                              Reopen
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <label className="text-xs uppercase tracking-[0.2em] text-muted">
                          Note
                        </label>
                        <textarea
                          value={alertNoteDraft}
                          onChange={(event) => setAlertNoteDraft(event.target.value)}
                          placeholder="Add acknowledgment notes..."
                          className="h-24 w-full rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateAlertState(selectedAlert.id, selectedAlertStatus)}
                          className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border bg-base/40 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Source</p>
                        <p className="mt-2 text-sm font-semibold">
                          {selectedAlert.sourceLabel || selectedAlert.source}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-base/40 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Event time</p>
                        <p className="mt-2 text-sm font-semibold">
                          {new Date(selectedAlert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-border bg-base/40 p-6 text-center text-sm text-muted">
                    Select an alert from the list to view details.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
