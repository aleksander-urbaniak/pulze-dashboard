"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";

import type { Alert, Settings, User } from "../lib/types";

type AppNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  tone: "success" | "error" | "info";
};

type UserGreetingPillProps = {
  user: User;
  settings?: Settings | null;
  notifications?: Alert[];
  newAlertCount?: number;
  isNotificationsOpen?: boolean;
  onToggleNotifications?: () => void;
  onClearNotifications?: () => void;
  getAlertSourceUrl?: (alert: Alert) => string | null;
  appNotifications?: AppNotification[];
  appNotificationCount?: number;
  onClearAppNotifications?: () => void;
};

export default function UserGreetingPill({
  user,
  settings,
  notifications,
  newAlertCount,
  isNotificationsOpen,
  onToggleNotifications,
  onClearNotifications,
  getAlertSourceUrl,
  appNotifications = [],
  appNotificationCount = 0,
  onClearAppNotifications
}: UserGreetingPillProps) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  const isControlled =
    notifications !== undefined &&
    newAlertCount !== undefined &&
    isNotificationsOpen !== undefined &&
    onToggleNotifications !== undefined &&
    onClearNotifications !== undefined &&
    getAlertSourceUrl !== undefined;
  const [internalNotifications, setInternalNotifications] = useState<Alert[]>([]);
  const [internalNewAlertCount, setInternalNewAlertCount] = useState(0);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const lastAlertIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setInternalIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isControlled) {
      return;
    }

    let isMounted = true;

    async function loadNotifications() {
      const response = await fetch("/api/alerts");
      if (!response.ok || !isMounted) {
        return;
      }
      const data = (await response.json()) as { alerts?: Alert[] };
      const nextAlerts = data.alerts ?? [];
      const alertKey = (alert: Alert) => alert.groupKey ?? alert.id;
      const currentIds = new Set(nextAlerts.map((alert) => alertKey(alert)));

      if (lastAlertIdsRef.current) {
        const newAlerts = nextAlerts.filter((alert) => !lastAlertIdsRef.current?.has(alertKey(alert)));
        if (newAlerts.length > 0) {
          setInternalNotifications((prev) => [...newAlerts, ...prev].slice(0, 20));
          setInternalNewAlertCount((count) => count + newAlerts.length);
        }
      } else {
        setInternalNotifications(nextAlerts.slice(0, 20));
      }

      lastAlertIdsRef.current = currentIds;
    }

    void loadNotifications();
    const interval = window.setInterval(
      () => void loadNotifications(),
      Math.max(5, settings?.refreshInterval ?? 30) * 1000
    );

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isControlled, settings?.refreshInterval]);

  const effectiveNotifications = isControlled ? notifications : internalNotifications;
  const effectiveAlertCount = isControlled ? newAlertCount : internalNewAlertCount;
  const effectiveIsOpen = isControlled ? isNotificationsOpen : internalIsOpen;
  const effectiveNewAlertCount = effectiveAlertCount + appNotificationCount;

  const effectiveGetAlertSourceUrl = useMemo(() => {
    if (getAlertSourceUrl) {
      return getAlertSourceUrl;
    }

    return (alert: Alert) => {
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
    };
  }, [getAlertSourceUrl, settings]);

  const mergedNotifications = useMemo(() => {
    const alertItems = effectiveNotifications.map((alert) => ({
      id: `alert-${alert.id}`,
      timestamp: alert.timestamp,
      kind: "alert" as const,
      alert
    }));
    const appItems = appNotifications.map((notification) => ({
      id: `app-${notification.id}`,
      timestamp: notification.timestamp,
      kind: "app" as const,
      notification
    }));

    return [...appItems, ...alertItems].sort(
      (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)
    );
  }, [appNotifications, effectiveNotifications]);

  const notificationTitle =
    effectiveNewAlertCount > 0 ? `${effectiveNewAlertCount} new notifications` : "No new notifications";

  function handleToggleNotifications() {
    if (onToggleNotifications) {
      onToggleNotifications();
      return;
    }
    setInternalIsOpen((open) => !open);
    setInternalNewAlertCount(0);
  }

  function handleClearNotifications() {
    if (onClearNotifications) {
      onClearNotifications();
    }
    onClearAppNotifications?.();
    if (onClearNotifications) {
      return;
    }
    setInternalNotifications([]);
    setInternalNewAlertCount(0);
  }

  return (
    <div ref={notificationsRef} className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggleNotifications}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={effectiveIsOpen}
        title={notificationTitle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/90 text-muted shadow-card transition hover:text-accent"
      >
        <FontAwesomeIcon icon={faBell} className="h-3.5 w-3.5" />
        {effectiveNewAlertCount > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        ) : null}
      </button>
      <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-3.5 py-2 shadow-card">
        <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-text">
          Hello, {user.firstName}!
        </span>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-on-accent">
          {initials}
        </span>
      </div>

      <div
        className={clsx(
          "absolute right-0 top-full z-50 mt-3 w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-border bg-surface/95 p-3.5 text-text shadow-[0_24px_44px_-30px_rgba(0,0,0,0.25)] backdrop-blur transition duration-200 ease-in-out dark:shadow-[0_24px_44px_-30px_rgba(0,0,0,0.95)]",
          effectiveIsOpen
            ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
        )}
        aria-hidden={!effectiveIsOpen}
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Notifications</p>
          {mergedNotifications.length > 0 ? (
            <button
              type="button"
              onClick={handleClearNotifications}
              className="text-xs uppercase tracking-[0.2em] text-muted"
            >
              Clear
            </button>
          ) : null}
        </div>
        {mergedNotifications.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No new alerts yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {mergedNotifications.map((item) => {
              if (item.kind === "app") {
                const notification = item.notification;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-base/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-text">{notification.title}</span>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                          notification.tone === "success"
                            ? "bg-emerald-400/15 text-emerald-300"
                            : notification.tone === "error"
                              ? "bg-rose-500/15 text-rose-400"
                              : "bg-sky-400/15 text-sky-300"
                        )}
                      >
                        {notification.tone}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{notification.message}</p>
                    <div className="mt-2 text-xs text-muted">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              }

              const alert = item.alert;
              const alertSourceUrl = effectiveGetAlertSourceUrl(alert);
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-base/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
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
                          ? "bg-rose-500/15 text-rose-400"
                          : alert.severity === "warning"
                            ? "bg-amber-400/20 text-amber-300"
                            : "bg-emerald-400/15 text-emerald-300"
                      )}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{alert.sourceLabel || alert.source}</span>
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

