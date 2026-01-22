"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Sidebar from "../../components/Sidebar";
import { defaultAppearance } from "../../lib/appearance";
import type { Alert, Settings, User } from "../../lib/types";
import {
  filterCookieKey,
  filterCookieMaxAge,
  filterStorageKey,
  severityOptions,
  sourceOptions,
  viewModeOptions,
  type SeverityOption,
  type SourceOption,
  type ViewMode
} from "./constants";
import { exportAlertsToCsv, formatRelativeTime, readCookieValue, writeCookieValue } from "./utils";
import type {
  AlertResponse,
  ApiError,
  BootstrapResponse,
  SettingsResponse,
  UserResponse
} from "./types";
import AuthScreen from "./components/AuthScreen";
import DashboardHeader from "./components/DashboardHeader";
import AlertsToolbar from "./components/AlertsToolbar";
import AlertsBulkActions from "./components/AlertsBulkActions";
import AlertsCardsView from "./components/AlertsCardsView";
import AlertsTableView from "./components/AlertsTableView";
import AlertsSplitView from "./components/AlertsSplitView";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [sourceHealth, setSourceHealth] = useState<AlertResponse["health"] | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<SourceOption>("All");
  const [filterSeverity, setFilterSeverity] = useState<SeverityOption>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
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
        source: SourceOption;
        severity: SeverityOption;
        viewMode: ViewMode;
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
      writeCookieValue(filterCookieKey, "", filterCookieMaxAge);
    }
  }, []);

  function persistFilters(next?: {
    source?: SourceOption;
    severity?: SeverityOption;
    viewMode?: ViewMode;
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
    writeCookieValue(filterCookieKey, payload, filterCookieMaxAge);
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

  async function updateAlertStateBulk(status: "active" | "acknowledged" | "resolved") {
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
      <AuthScreen
        needsSetup={needsSetup}
        isCheckingSetup={isCheckingSetup}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        setupForm={setupForm}
        setSetupForm={setSetupForm}
        loginError={loginError}
        setupError={setupError}
        onLoginSubmit={handleLogin}
        onSetupSubmit={handleSetup}
      />
    );
  }

  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId) ?? null;
  const selectedAlertStatus = (selectedAlert?.ackStatus ?? "active") as
    | "active"
    | "acknowledged"
    | "resolved";
  const selectedAlertSourceUrl = selectedAlert ? getAlertSourceUrl(selectedAlert) : null;
  const staleSources = sourceHealth?.staleSources ?? [];

  const handleToggleNotifications = () => {
    setIsNotificationsOpen((open) => !open);
    setNewAlertCount(0);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setNewAlertCount(0);
  };

  const handleFilterSourceChange = (value: SourceOption) => {
    setFilterSource(value);
    persistFilters({ source: value });
  };

  const handleFilterSeverityChange = (value: SeverityOption) => {
    setFilterSeverity(value);
    persistFilters({ severity: value });
  };

  const handleViewModeChange = (value: ViewMode) => {
    setViewMode(value);
    persistFilters({ viewMode: value });
  };

  const handleToggleExpanded = (alertId: string) => {
    setExpandedAlertId((prev) => (prev === alertId ? null : alertId));
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="flex-1 min-w-0">
        <main className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-6 sm:py-8">
          <DashboardHeader
            user={user}
            notifications={notifications}
            newAlertCount={newAlertCount}
            isNotificationsOpen={isNotificationsOpen}
            notificationsRef={notificationsRef}
            onToggleNotifications={handleToggleNotifications}
            onClearNotifications={handleClearNotifications}
            getAlertSourceUrl={getAlertSourceUrl}
          />

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

          <AlertsToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            searchInputRef={searchInputRef}
            filterSource={filterSource}
            filterSeverity={filterSeverity}
            sourceFilterOptions={sourceFilterOptions}
            severityFilterOptions={severityFilterOptions}
            onFilterSourceChange={handleFilterSourceChange}
            onFilterSeverityChange={handleFilterSeverityChange}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isLoadingAlerts={isLoadingAlerts}
            onRefresh={() => void loadAlerts()}
            activeCount={filteredAlerts.length}
          />

          <AlertsBulkActions
            filteredAlerts={filteredAlerts}
            selectedAlertIds={selectedAlertIds}
            onSelectAll={selectAllFiltered}
            onClearSelection={clearSelectedAlerts}
            onExportAlerts={exportAlertsToCsv}
            onBulkUpdate={updateAlertStateBulk}
          />

          {viewMode === "cards" ? (
            <AlertsCardsView
              alerts={filteredAlerts}
              expandedAlertId={expandedAlertId}
              selectedAlertIds={selectedAlertIds}
              alertNoteDraft={alertNoteDraft}
              onAlertNoteChange={setAlertNoteDraft}
              onSelectAlert={setSelectedAlertId}
              onToggleExpanded={handleToggleExpanded}
              onCloseExpanded={() => setExpandedAlertId(null)}
              onToggleSelection={toggleAlertSelection}
              onUpdateAlertState={updateAlertState}
              getAlertSourceUrl={getAlertSourceUrl}
            />
          ) : viewMode === "table" ? (
            <AlertsTableView
              alerts={filteredAlerts}
              expandedAlertId={expandedAlertId}
              selectedAlertIds={selectedAlertIds}
              alertNoteDraft={alertNoteDraft}
              onAlertNoteChange={setAlertNoteDraft}
              onSelectAlert={setSelectedAlertId}
              onToggleExpanded={handleToggleExpanded}
              onToggleSelection={toggleAlertSelection}
              onUpdateAlertState={updateAlertState}
              getAlertSourceUrl={getAlertSourceUrl}
            />
          ) : (
            <AlertsSplitView
              alerts={filteredAlerts}
              selectedAlertId={selectedAlertId}
              selectedAlert={selectedAlert}
              selectedAlertStatus={selectedAlertStatus}
              selectedAlertSourceUrl={selectedAlertSourceUrl}
              selectedAlertIds={selectedAlertIds}
              listItemRefs={listItemRefs}
              alertNoteDraft={alertNoteDraft}
              onAlertNoteChange={setAlertNoteDraft}
              onSelectAlert={setSelectedAlertId}
              onToggleSelection={toggleAlertSelection}
              onUpdateAlertState={updateAlertState}
              getAlertSourceUrl={getAlertSourceUrl}
            />
          )}
        </main>
      </div>
    </div>
  );
}
