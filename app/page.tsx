"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import ThemeToggle from "../components/ThemeToggle";
import Sidebar from "../components/Sidebar";
import FilterSelect from "../components/FilterSelect";
import { defaultAppearance } from "../lib/appearance";
import type { Alert, DataSourceHealth, Settings, User } from "../lib/types";
import styles from "./page.module.css";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

const sourceOptions = ["All", "Prometheus", "Zabbix", "Kuma"] as const;
const severityOptions = ["All", "critical", "warning", "info"] as const;
const viewModeOptions = ["cards", "table", "split"] as const;
const filterStorageKey = "pulze-dashboard:filters";
const filterCookieKey = "pulze_dashboard_filters";
const filterCookieMaxAge = 60 * 60 * 24 * 60;

function readCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }
  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!entry) {
    return null;
  }
  return decodeURIComponent(entry.split("=").slice(1).join("="));
}

function writeCookieValue(name: string, value: string) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${filterCookieMaxAge}; samesite=lax`;
}

type ApiError = { source: string; message: string };

type AlertResponse = {
  alerts: Alert[];
  errors: ApiError[];
  health?: {
    staleThresholdMs: number;
    sources: DataSourceHealth[];
    staleSources: DataSourceHealth[];
  };
};

type SettingsResponse = { settings: Settings; canEdit: boolean };

type UserResponse = { user: User };

type BootstrapResponse = { needsSetup: boolean };


export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [sourceHealth, setSourceHealth] = useState<AlertResponse["health"] | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<(typeof sourceOptions)[number]>("All");
  const [filterSeverity, setFilterSeverity] = useState<(typeof severityOptions)[number]>("All");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "split">("cards");
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
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  const [alertNoteDraft, setAlertNoteDraft] = useState("");
  const lastAlertIdsRef = useRef<Set<string> | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const sourceFilterOptions = sourceOptions.map((option) => ({ value: option, label: option }));
  const severityFilterOptions = severityOptions.map((option) => ({ value: option, label: option }));

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(filterStorageKey);
    } catch {
      saved = null;
    }
    if (!saved) {
      saved = readCookieValue(filterCookieKey);
    }
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved) as Partial<{
        source: (typeof sourceOptions)[number];
        severity: (typeof severityOptions)[number];
        viewMode: (typeof viewModeOptions)[number];
      }>;
      if (parsed.source && sourceOptions.includes(parsed.source)) {
        setFilterSource(parsed.source);
      }
      if (parsed.severity && severityOptions.includes(parsed.severity)) {
        setFilterSeverity(parsed.severity);
      }
      if (parsed.viewMode && viewModeOptions.includes(parsed.viewMode)) {
        setViewMode(parsed.viewMode);
      }
    } catch {
      window.localStorage.removeItem(filterStorageKey);
      writeCookieValue(filterCookieKey, "");
    }
  }, []);

  function persistFilters(next?: {
    source?: (typeof sourceOptions)[number];
    severity?: (typeof severityOptions)[number];
    viewMode?: (typeof viewModeOptions)[number];
  }) {
    if (typeof window === "undefined") {
      return;
    }
    const payload = JSON.stringify({
      source: next?.source ?? filterSource,
      severity: next?.severity ?? filterSeverity,
      viewMode: next?.viewMode ?? viewMode
    });
    try {
      window.localStorage.setItem(filterStorageKey, payload);
    } catch {
      // Ignore storage failures and rely on cookie fallback.
    }
    writeCookieValue(filterCookieKey, payload);
  }

  function getAlertSourceUrl(alert: Alert) {
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

  function formatRelativeTime(value: string | null | undefined) {
    if (!value) {
      return "never";
    }
    const parsed = new Date(value).getTime();
    if (Number.isNaN(parsed)) {
      return "unknown";
    }
    const diffMs = Date.now() - parsed;
    const isFuture = diffMs < 0;
    const diffMinutes = Math.round(Math.abs(diffMs) / 60000);
    if (diffMinutes < 1) {
      return isFuture ? "soon" : "just now";
    }
    const minutes = diffMinutes;
    if (minutes < 60) {
      return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return isFuture ? `in ${hours}h` : `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return isFuture ? `in ${days}d` : `${days}d ago`;
  }

  function toggleAlertSelection(alertId: string) {
    setSelectedAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedAlertIds(new Set(filteredAlerts.map((alert) => alert.id)));
  }

  function clearSelectedAlerts() {
    setSelectedAlertIds(new Set());
  }

  async function updateAlertStateBulk(
    status: "active" | "acknowledged" | "resolved"
  ) {
    const ids = Array.from(selectedAlertIds);
    if (ids.length === 0) {
      return;
    }
    const response = await fetch("/api/alerts/state/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertIds: ids, status, note: null })
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as {
      states: Array<{
        alertId: string;
        status: "active" | "acknowledged" | "resolved";
        note: string;
        updatedAt: string;
        updatedBy: string | null;
        acknowledgedAt: string | null;
        resolvedAt: string | null;
      }>;
    };
    const stateMap = new Map(data.states.map((state) => [state.alertId, state]));
    setAlerts((prev) =>
      prev.map((alert) => {
        const state = stateMap.get(alert.id);
        if (!state) {
          return alert;
        }
        return {
          ...alert,
          ackStatus: state.status,
          ackNote: state.note,
          ackUpdatedAt: state.updatedAt,
          ackUpdatedBy: state.updatedBy ?? undefined,
          acknowledgedAt: state.acknowledgedAt ?? undefined,
          resolvedAt: state.resolvedAt ?? undefined
        };
      })
    );
    clearSelectedAlerts();
  }

  function exportAlertsToCsv(targetAlerts: Alert[]) {
    if (targetAlerts.length === 0) {
      return;
    }
    const headers = [
      "id",
      "name",
      "severity",
      "source",
      "sourceLabel",
      "instance",
      "message",
      "timestamp",
      "status",
      "note"
    ];
    const escapeValue = (value: string) => `"${value.replace(/\"/g, "\"\"")}"`;
    const rows = targetAlerts.map((alert) => [
      alert.id,
      alert.name,
      alert.severity,
      alert.source,
      alert.sourceLabel ?? "",
      alert.instance ?? "",
      alert.message,
      alert.timestamp,
      alert.ackStatus ?? "active",
      alert.ackNote ?? ""
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((value) => escapeValue(String(value))).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alerts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

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
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (viewMode === "split") {
      setExpandedAlertId(null);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "split" || !selectedAlertId) {
      return;
    }
    const node = listItemRefs.current.get(selectedAlertId);
    if (!node) {
      return;
    }
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [selectedAlertId, viewMode]);

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

  useEffect(() => {
    setSelectedAlertIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const allowed = new Set(filteredAlerts.map((alert) => alert.id));
      const next = new Set(Array.from(prev).filter((id) => allowed.has(id)));
      if (next.size === prev.size) {
        return prev;
      }
      return next;
    });
  }, [filteredAlerts]);

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
    if (!expandedAlertId) {
      return;
    }
    if (!filteredAlerts.some((alert) => alert.id === expandedAlertId)) {
      setExpandedAlertId(null);
    }
  }, [expandedAlertId, filteredAlerts]);

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
    setSourceHealth(data.health ?? null);
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
  const selectedAlertSourceUrl = selectedAlert ? getAlertSourceUrl(selectedAlert) : null;
  const hasSelection = selectedAlertIds.size > 0;
  const allSelected = filteredAlerts.length > 0 && selectedAlertIds.size === filteredAlerts.length;
  const staleSources = sourceHealth?.staleSources ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-base md:flex-row">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1">
        <main className="mx-auto w-full max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Dashboard</p>
              <h2 className="text-2xl font-semibold">Monitoring Overview</h2>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
              <div ref={notificationsRef} className="relative z-40">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationsOpen((open) => !open);
                    setNewAlertCount(0);
                  }}
                  className="relative rounded-full border border-border bg-surface/80 p-2"
                  aria-label="Notifications"
                  aria-haspopup="menu"
                  aria-expanded={isNotificationsOpen}
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
                <div
                  className={clsx(
                    "absolute right-0 mt-3 w-80 origin-top-right rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur z-50 transition duration-200 ease-in-out",
                    isNotificationsOpen
                      ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
                      : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
                  )}
                  aria-hidden={!isNotificationsOpen}
                >
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
                        {notifications.map((alert) => {
                          const alertSourceUrl = getAlertSourceUrl(alert);
                          return (
                            <div
                              key={`notify-${alert.id}`}
                              className="rounded-xl border border-border bg-base/60 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">
                                  {alertSourceUrl ? (
                                    <a href={alertSourceUrl} className="text-accent hover:underline">
                                      {alert.name}
                                    </a>
                                  ) : (
                                    alert.name
                                  )}
                                </span>
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
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>
              <div className="rounded-full border border-border bg-surface/80 px-4 py-2 text-xs uppercase tracking-[0.2em]">
                Hello, {user.firstName}!
              </div>
            </div>
          </div>

          {staleSources.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                Stale sources
              </p>
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                {staleSources
                  .map((source) => {
                    const label = source.sourceLabel
                      ? `${source.sourceType} (${source.sourceLabel})`
                      : source.sourceType;
                    const lastSuccess = formatRelativeTime(source.lastSuccessAt ?? null);
                    const retry =
                      source.nextRetryAt ? `, retry ${formatRelativeTime(source.nextRetryAt)}` : "";
                    return `${label} last success ${lastSuccess}${retry}`;
                  })
                  .join(" | ")}
              </p>
            </div>
          ) : null}

          <div className={styles.latestHeader}>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Alerts</p>
              <h3 className="text-xl font-semibold">Current Alerts</h3>
              <p className={styles.latestMeta}>Active alerts: {filteredAlerts.length}</p>
            </div>
            <div className={styles.latestControls}>
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>
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
                  placeholder="(/ to search, Esc to clear)"
                  aria-label="Search alerts"
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.latestFilters}>
                <FilterSelect
                  value={filterSource}
                  onChange={(value) =>
                    {
                      const nextValue = value as (typeof sourceOptions)[number];
                      setFilterSource(nextValue);
                      persistFilters({ source: nextValue });
                    }
                  }
                  options={sourceFilterOptions}
                  ariaLabel="Source filter"
                  className={styles.filterSelect}
                  optionClassName="text-sm"
                />
                <FilterSelect
                  value={filterSeverity}
                  onChange={(value) =>
                    {
                      const nextValue = value as (typeof severityOptions)[number];
                      setFilterSeverity(nextValue);
                      persistFilters({ severity: nextValue });
                    }
                  }
                  options={severityFilterOptions}
                  ariaLabel="Severity filter"
                  className={styles.filterSelect}
                  optionClassName="text-sm"
                />
              </div>
              <div className={styles.viewToggle}>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("cards");
                    persistFilters({ viewMode: "cards" });
                  }}
                  className={clsx(
                    styles.viewToggleButton,
                    viewMode === "cards" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("table");
                    persistFilters({ viewMode: "table" });
                  }}
                  className={clsx(
                    styles.viewToggleButton,
                    viewMode === "table" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("split");
                    persistFilters({ viewMode: "split" });
                  }}
                  className={clsx(
                    styles.viewToggleButton,
                    viewMode === "split" ? "bg-accent text-white" : "text-muted"
                  )}
                >
                  Split
                </button>
              </div>
              <button
                type="button"
                onClick={() => void loadAlerts()}
                className={styles.refreshButton}
              >
                {isLoadingAlerts ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          {filteredAlerts.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-4 py-3 text-xs uppercase tracking-[0.2em] text-muted">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (allSelected) {
                      clearSelectedAlerts();
                    } else {
                      selectAllFiltered();
                    }
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
                {hasSelection ? (
                  <span className="text-xs uppercase tracking-[0.2em] text-muted">
                    {selectedAlertIds.size} selected
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = hasSelection
                      ? filteredAlerts.filter((alert) => selectedAlertIds.has(alert.id))
                      : filteredAlerts;
                    exportAlertsToCsv(target);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  disabled={!hasSelection}
                  onClick={() => updateAlertStateBulk("acknowledged")}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Acknowledge
                </button>
                <button
                  type="button"
                  disabled={!hasSelection}
                  onClick={() => updateAlertStateBulk("resolved")}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                >
                  Resolve
                </button>
                {hasSelection ? (
                  <button
                    type="button"
                    onClick={clearSelectedAlerts}
                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {viewMode === "cards" ? (
            <div className="mt-4">
              <button
                type="button"
                aria-label="Close expanded alert"
                onClick={() => setExpandedAlertId(null)}
                tabIndex={expandedAlertId ? 0 : -1}
                aria-hidden={!expandedAlertId}
                className={clsx(
                  styles.focusOverlay,
                  expandedAlertId ? styles.focusOverlayVisible : null
                )}
              />
              <div className={styles.cardGrid}>
                {filteredAlerts.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-border bg-base/40 p-8 text-center text-sm text-muted">
                    No alerts match your filters.
                  </div>
                ) : (
                filteredAlerts.map((alert) => {
                  const alertSourceUrl = getAlertSourceUrl(alert);
                  const isExpanded = expandedAlertId === alert.id;
                  const alertStatus = alert.ackStatus ?? "active";
                  const notePreview = alert.ackNote?.trim();
                  const instanceLabel = alert.sourceLabel || alert.source;
                  const isSelected = selectedAlertIds.has(alert.id);
                  return (
                    <div
                      key={alert.id}
                      role="button"
                      tabIndex={0}
                        onClick={() => {
                          setSelectedAlertId(alert.id);
                          setExpandedAlertId((prev) => (prev === alert.id ? null : alert.id));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedAlertId(alert.id);
                            setExpandedAlertId((prev) => (prev === alert.id ? null : alert.id));
                          }
                        }}
                        className={clsx(
                          styles.card,
                          expandedAlertId && !isExpanded ? styles.cardMuted : null,
                          isExpanded ? styles.cardExpanded : null,
                          alert.severity === "critical"
                            ? styles.cardSeverityCritical
                            : alert.severity === "warning"
                              ? styles.cardSeverityWarning
                              : styles.cardSeverityInfo
                        )}
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleAlertSelection(alert.id);
                          }}
                          aria-pressed={isSelected}
                          aria-label={isSelected ? "Deselect alert" : "Select alert"}
                          className={clsx(
                            "absolute left-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                            isSelected
                              ? "border-accent bg-accent text-white"
                              : "border-border bg-base/80 text-muted"
                          )}
                        >
                          {isSelected ? "x" : ""}
                        </button>
                        <span className="absolute right-4 top-4 max-w-[60%] truncate rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
                          {instanceLabel}
                        </span>
                        <p className={clsx("text-xs uppercase tracking-[0.3em] text-muted", styles.cardSeverityLabel)}>
                          {alert.severity}
                        </p>
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
                        <h3 className="mt-3 text-lg font-semibold break-all">
                          {alertSourceUrl ? (
                            <a
                              href={alertSourceUrl}
                              className="text-accent hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {alert.name}
                            </a>
                          ) : (
                            alert.name
                          )}
                        </h3>
                        {alert.instance ? (
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted break-words">
                            {alert.instance}
                          </p>
                        ) : null}
                        <p className="mt-3 text-sm text-muted break-words">{alert.message}</p>
                        {notePreview && !isExpanded ? (
                          <p className={styles.cardNotePreview}>
                            Note: {notePreview}
                          </p>
                        ) : null}
                        <p className="mt-6 text-xs text-muted">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                        <div
                          className={clsx(
                            styles.cardDetail,
                            isExpanded ? styles.cardDetailOpen : null
                          )}
                          onClick={(event) => event.stopPropagation()}
                          aria-hidden={!isExpanded}
                        >
                          <div className="rounded-xl border border-border bg-base/40 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                                  Status
                                </p>
                                <p className="mt-2 text-sm font-semibold capitalize">
                                  {alertStatus}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateAlertState(alert.id, "acknowledged")}
                                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                >
                                  Acknowledge
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateAlertState(alert.id, "resolved")}
                                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                >
                                  Resolve
                                </button>
                                {alertStatus !== "active" ? (
                                  <button
                                    type="button"
                                    onClick={() => updateAlertState(alert.id, "active")}
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
                                onClick={() => updateAlertState(alert.id, alertStatus)}
                                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : viewMode === "table" ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface/90 shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">Select</th>
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
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                        No alerts match your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert) => {
                      const alertSourceUrl = getAlertSourceUrl(alert);
                      const isExpanded = expandedAlertId === alert.id;
                      const alertStatus = alert.ackStatus ?? "active";
                      const isSelected = selectedAlertIds.has(alert.id);
                      return (
                        <Fragment key={alert.id}>
                          <tr
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedAlertId(alert.id);
                              setExpandedAlertId((prev) => (prev === alert.id ? null : alert.id));
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedAlertId(alert.id);
                                setExpandedAlertId((prev) =>
                                  prev === alert.id ? null : alert.id
                                );
                              }
                            }}
                            className={clsx(
                              "border-t border-border bg-base/40",
                              isExpanded ? styles.tableRowActive : null
                            )}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleAlertSelection(alert.id);
                                }}
                                aria-pressed={isSelected}
                                aria-label={isSelected ? "Deselect alert" : "Select alert"}
                                className={clsx(
                                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                                  isSelected
                                    ? "border-accent bg-accent text-white"
                                    : "border-border bg-base/80 text-muted"
                                )}
                              >
                                {isSelected ? "x" : ""}
                              </button>
                            </td>
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
                            <td className="px-4 py-3">
                              {alertSourceUrl ? (
                                <a
                                  href={alertSourceUrl}
                                  className="text-accent hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {alert.name}
                                </a>
                              ) : (
                                alert.name
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {new Date(alert.timestamp).toLocaleString()}
                            </td>
                          </tr>
                          <tr
                            className={styles.tableDetailRow}
                            aria-hidden={!isExpanded}
                          >
                            <td
                              colSpan={7}
                              className={clsx(
                                styles.tableDetailCell,
                                !isExpanded ? styles.tableDetailCellCollapsed : null
                              )}
                            >
                              <div
                                className={clsx(
                                  styles.tableDetail,
                                  isExpanded ? styles.tableDetailOpen : null
                                )}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="rounded-xl border border-border bg-base/40 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.2em] text-muted">
                                        Status
                                      </p>
                                      <p className="mt-2 text-sm font-semibold capitalize">
                                        {alertStatus}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateAlertState(alert.id, "acknowledged")}
                                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                      >
                                        Acknowledge
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateAlertState(alert.id, "resolved")}
                                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                      >
                                        Resolve
                                      </button>
                                      {alertStatus !== "active" ? (
                                        <button
                                          type="button"
                                          onClick={() => updateAlertState(alert.id, "active")}
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
                                      onClick={() => updateAlertState(alert.id, alertStatus)}
                                      className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                                    >
                                      Save Note
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })
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
                    {filteredAlerts.map((alert) => {
                      const alertSourceUrl = getAlertSourceUrl(alert);
                      const isSelected = selectedAlertIds.has(alert.id);
                      return (
                        <div
                          key={alert.id}
                          role="button"
                          tabIndex={0}
                          ref={(node) => {
                            if (node) {
                              listItemRefs.current.set(alert.id, node);
                            } else {
                              listItemRefs.current.delete(alert.id);
                            }
                          }}
                          onClick={() => setSelectedAlertId(alert.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedAlertId(alert.id);
                            }
                          }}
                          className={clsx(
                            "w-full rounded-xl border px-4 py-3 text-left transition",
                            selectedAlertId === alert.id
                              ? "border-accent bg-accent/10"
                              : "border-border bg-base/40 hover:border-accent/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleAlertSelection(alert.id);
                                }}
                                aria-pressed={isSelected}
                                aria-label={isSelected ? "Deselect alert" : "Select alert"}
                                className={clsx(
                                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                                  isSelected
                                    ? "border-accent bg-accent text-white"
                                    : "border-border bg-base/80 text-muted"
                                )}
                              >
                                {isSelected ? "x" : ""}
                              </button>
                              <span className="text-sm font-semibold">
                                {alertSourceUrl ? (
                                  <a
                                    href={alertSourceUrl}
                                    className="text-accent hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {alert.name}
                                  </a>
                                ) : (
                                  alert.name
                                )}
                              </span>
                            </div>
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
                        </div>
                      );
                    })}
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
                      <h3 className="mt-2 text-2xl font-semibold">
                        {selectedAlertSourceUrl ? (
                          <a href={selectedAlertSourceUrl} className="text-accent hover:underline">
                            {selectedAlert.name}
                          </a>
                        ) : (
                          selectedAlert.name
                        )}
                      </h3>
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
