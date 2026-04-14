"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAppSession } from "../../lib/app-session";
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
import type { AlertResponse, ApiError } from "./types";
import DashboardHeader from "./components/DashboardHeader";
import AlertsToolbar from "./components/AlertsToolbar";
import AlertsBulkActions from "./components/AlertsBulkActions";
import AlertsCardsView from "./components/AlertsCardsView";
import AlertsTableView from "./components/AlertsTableView";
import AlertsSplitView from "./components/AlertsSplitView";

const disappearedEventsStoragePrefix = "pulze.disappearedEvents";

type DisappearedAlertEvent = {
  id: string;
  source: string;
  startedAt: string;
  disappearedAt: string;
  durationMinutes: number;
};

export default function HomePage() {
  const { user, settings } = useAppSession();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [sourceHealth, setSourceHealth] = useState<AlertResponse["health"] | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<SourceOption>("All");
  const [filterSeverity, setFilterSeverity] = useState<SeverityOption>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [newAlertCount, setNewAlertCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  const [alertNoteDraft, setAlertNoteDraft] = useState("");
  const [disappearedEvents, setDisappearedEvents] = useState<DisappearedAlertEvent[]>([]);
  const [
    disappearedEventsHydratedKey,
    setDisappearedEventsHydratedKey
  ] = useState<string | null>(null);
  const lastAlertIdsRef = useRef<Set<string> | null>(null);
  const lastAlertsByKeyRef = useRef<Map<string, Alert>>(new Map());
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const sourceFilterOptions = sourceOptions.map((option) => ({ value: option, label: option }));
  const severityFilterOptions = severityOptions.map((option) => ({ value: option, label: option }));
  const disappearedEventsStorageKey = `${disappearedEventsStoragePrefix}.${user?.id ?? "guest"}`;

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

  useEffect(() => {
    if (typeof window === "undefined" || !user) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(disappearedEventsStorageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as DisappearedAlertEvent[];
      if (!Array.isArray(parsed)) {
        return;
      }
      const now = Date.now();
      const maxAgeMs = 14 * 24 * 60 * 60 * 1000;
      const normalized = parsed
        .filter((event) => {
          const disappearedAt = Date.parse(event.disappearedAt);
          return Number.isFinite(disappearedAt) && now - disappearedAt <= maxAgeMs;
        })
        .slice(0, 500);
      setDisappearedEvents(normalized);
    } catch {
      window.localStorage.removeItem(disappearedEventsStorageKey);
    } finally {
      setDisappearedEventsHydratedKey(disappearedEventsStorageKey);
    }
  }, [disappearedEventsStorageKey, user]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) {
      return;
    }
    if (disappearedEventsHydratedKey !== disappearedEventsStorageKey) {
      return;
    }
    try {
      window.localStorage.setItem(disappearedEventsStorageKey, JSON.stringify(disappearedEvents));
    } catch {
      // ignore storage issues
    }
  }, [disappearedEvents, disappearedEventsHydratedKey, disappearedEventsStorageKey, user]);

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
    if (!settings) return null;
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
    if (!user?.permissions?.includes("alerts.ack")) {
      return;
    }
    const ids = Array.from(
      new Set(
        Array.from(selectedAlertIds).flatMap((selectedId) => {
          const entry = filteredAlerts.find((alert) => alert.id === selectedId);
          return entry?.groupedAlertIds?.length ? entry.groupedAlertIds : [selectedId];
        })
      )
    );
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
    await loadAlerts();
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
    const alertKey = (alert: Alert) => alert.groupKey ?? alert.id;
    const currentMap = new Map<string, Alert>(data.alerts.map((alert) => [alertKey(alert), alert]));
    const currentIds = new Set(currentMap.keys());
    if (lastAlertIdsRef.current) {
      const newAlerts = data.alerts.filter(
        (alert) => !lastAlertIdsRef.current?.has(alertKey(alert))
      );
      if (newAlerts.length > 0) {
        setNewAlertCount((count) => count + newAlerts.length);
        setNotifications((prev) => [...newAlerts, ...prev].slice(0, 20));
      }

      const disappearedEventsBatch = Array.from(lastAlertsByKeyRef.current.entries())
        .filter(([key]) => !currentMap.has(key))
        .map(([key, previousAlert]) => {
          const disappearedAt = new Date().toISOString();
          const durationMs = Date.parse(disappearedAt) - Date.parse(previousAlert.timestamp);
          const durationMinutes =
            Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs / 60000) : 0;
          return {
            id: key,
            source: previousAlert.sourceLabel?.trim() || previousAlert.source || "Unknown",
            startedAt: previousAlert.timestamp,
            disappearedAt,
            durationMinutes
          } as DisappearedAlertEvent;
        });
      if (disappearedEventsBatch.length > 0) {
        setDisappearedEvents((prev) => [...disappearedEventsBatch, ...prev].slice(0, 500));
      }
    }
    lastAlertIdsRef.current = currentIds;
    lastAlertsByKeyRef.current = currentMap;
    setIsLoadingAlerts(false);
  }

  useEffect(() => {
    if (user) {
      void loadAlerts();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !settings?.refreshInterval) {
      return;
    }
    const interval = Math.max(5, settings.refreshInterval) * 1000;
    const timer = setInterval(() => {
      void loadAlerts();
    }, interval);
    return () => clearInterval(timer);
  }, [user, settings?.refreshInterval]);

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

  const unresolvedAlerts = useMemo(
    () => alerts.filter((alert) => (alert.ackStatus ?? "active") !== "resolved"),
    [alerts]
  );

  const criticalCount = useMemo(
    () => unresolvedAlerts.filter((alert) => alert.severity === "critical").length,
    [unresolvedAlerts]
  );

  const warningCount = useMemo(
    () => unresolvedAlerts.filter((alert) => alert.severity === "warning").length,
    [unresolvedAlerts]
  );

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

  async function updateAlertState(alertId: string, status: "active" | "acknowledged" | "resolved") {
    if (!user?.permissions?.includes("alerts.ack")) {
      return;
    }
    const entry = alerts.find((alert) => alert.id === alertId);
    const targetIds = entry?.groupedAlertIds?.length ? entry.groupedAlertIds : [alertId];
    const response = await fetch("/api/alerts/state/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertIds: targetIds, status, note: alertNoteDraft })
    });
    if (!response.ok) {
      return;
    }
    await loadAlerts();
  }

  if (!user || !settings) {
    return null;
  }

  const selectedAlert = filteredAlerts.find((alert) => alert.id === selectedAlertId) ?? null;
  const selectedAlertStatus = (selectedAlert?.ackStatus ?? "active") as
    | "active"
    | "acknowledged"
    | "resolved";
  const selectedAlertSourceUrl = selectedAlert ? getAlertSourceUrl(selectedAlert) : null;
  const staleSources = sourceHealth?.staleSources ?? [];
  const canAcknowledge = Boolean(user.permissions?.includes("alerts.ack"));

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
    <main className="w-full min-h-screen border-l border-[rgb(var(--app-divider)/0.82)] bg-[rgb(var(--app-main-bg))] px-4 pb-6 pt-2 sm:px-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1520px]">
        <DashboardHeader
          user={user}
          alerts={alerts}
          disappearedEvents={disappearedEvents}
          notifications={notifications}
          newAlertCount={newAlertCount}
          isNotificationsOpen={isNotificationsOpen}
          notificationsRef={notificationsRef}
          onToggleNotifications={handleToggleNotifications}
          onClearNotifications={handleClearNotifications}
          getAlertSourceUrl={getAlertSourceUrl}
        />

        {staleSources.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-400/45 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Stale sources</p>
            <p className="mt-2 text-sm text-amber-200/90">
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
          onRefresh={loadAlerts}
          activeCount={filteredAlerts.length}
        />

        <AlertsBulkActions
          filteredAlerts={filteredAlerts}
          selectedAlertIds={selectedAlertIds}
          criticalCount={criticalCount}
          warningCount={warningCount}
          onSelectAll={selectAllFiltered}
          onClearSelection={clearSelectedAlerts}
          onExportAlerts={exportAlertsToCsv}
          canAcknowledge={canAcknowledge}
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
            canAcknowledge={canAcknowledge}
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
            canAcknowledge={canAcknowledge}
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
            canAcknowledge={canAcknowledge}
          />
        )}
      </div>
    </main>
  );
}
