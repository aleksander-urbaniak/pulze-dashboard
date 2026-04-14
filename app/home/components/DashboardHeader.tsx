import { useMemo } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeHigh } from "@fortawesome/free-solid-svg-icons";

import type { Alert, User } from "../../../lib/types";
import styles from "../../page.module.css";

type DashboardHeaderProps = {
  user: User;
  alerts: Alert[];
  notifications: Alert[];
  newAlertCount: number;
  isNotificationsOpen: boolean;
  notificationsRef: React.RefObject<HTMLDivElement | null>;
  onToggleNotifications: () => void;
  onClearNotifications: () => void;
  getAlertSourceUrl: (alert: Alert) => string | null;
};

export default function DashboardHeader({
  user,
  alerts,
  notifications,
  newAlertCount,
  isNotificationsOpen,
  notificationsRef,
  onToggleNotifications,
  onClearNotifications,
  getAlertSourceUrl
}: DashboardHeaderProps) {
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

  const referenceTimestamp = useMemo(() => {
    const latest = alerts.reduce((max, alert) => {
      const value = Date.parse(alert.timestamp);
      if (!Number.isFinite(value)) {
        return max;
      }
      return Math.max(max, value);
    }, 0);
    return latest > 0 ? latest : null;
  }, [alerts]);

  const activeLastHour = useMemo(() => {
    if (!referenceTimestamp) {
      return 0;
    }
    const cutoff = referenceTimestamp - 60 * 60 * 1000;
    return unresolvedAlerts.filter((alert) => Date.parse(alert.timestamp) >= cutoff).length;
  }, [referenceTimestamp, unresolvedAlerts]);

  const avgResolutionMinutes = useMemo(() => {
    const values = alerts
      .map((alert) => {
        const resolvedAt = alert.resolvedAt ?? alert.ackUpdatedAt;
        if (!resolvedAt || alert.ackStatus !== "resolved") {
          return null;
        }
        const durationMs = Date.parse(resolvedAt) - Date.parse(alert.timestamp);
        if (!Number.isFinite(durationMs) || durationMs <= 0) {
          return null;
        }
        return durationMs / 60000;
      })
      .filter((value): value is number => value !== null);
    if (values.length === 0) {
      return 0;
    }
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [alerts]);

  const resolvedTodayCount = useMemo(() => {
    if (!referenceTimestamp) {
      return 0;
    }
    const cutoff = referenceTimestamp - 24 * 60 * 60 * 1000;
    return alerts.filter((alert) => {
      if (alert.ackStatus !== "resolved") {
        return false;
      }
      const value = alert.resolvedAt ?? alert.ackUpdatedAt;
      if (!value) {
        return false;
      }
      const resolvedTimestamp = Date.parse(value);
      return Number.isFinite(resolvedTimestamp) && resolvedTimestamp >= cutoff;
    }).length;
  }, [alerts, referenceTimestamp]);

  const systemLoad = useMemo(() => {
    if (alerts.length === 0) {
      return 0;
    }
    const weighted = criticalCount * 2 + warningCount;
    return Math.max(1, Math.min(99, Math.round((weighted / (alerts.length * 2)) * 100)));
  }, [alerts.length, criticalCount, warningCount]);

  const notificationTitle = useMemo(() => {
    if (newAlertCount > 0) {
      return `${newAlertCount} new alerts`;
    }
    return "No new alerts";
  }, [newAlertCount]);

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  const summaryCards = [
    {
      label: "Active Alerts",
      value: unresolvedAlerts.length.toString(),
      meta: `${activeLastHour} from last hour`,
      tone: "critical" as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12h4l2-5 4 11 2-6h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Avg. Resolution",
      value: `${avgResolutionMinutes}m`,
      meta: avgResolutionMinutes > 0 ? "from resolved incidents" : "no resolved incidents yet",
      tone: "ok" as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: "System Load",
      value: `${systemLoad}%`,
      meta: criticalCount > 0 ? "elevated" : warningCount > 0 ? "moderate" : "stable",
      tone: "warning" as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 3L5.5 13h5l-1 8L18.5 11h-5l1-8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    },
    {
      label: "Resolved 24h",
      value: resolvedTodayCount.toString(),
      meta: "closed incidents recently",
      tone: "info" as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M9 12.5l2.2 2.2L15.8 10"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    }
  ];

  return (
    <header className={styles.dashboardHeader}>
      <div className={styles.dashboardTopbar}>
        <div className="min-w-0">
          <div className={clsx(styles.dashboardTitleRow, "mt-0")}>
            <FontAwesomeIcon icon={faGaugeHigh} className="h-5 w-5 shrink-0 text-accent" />
            <h2 className={styles.dashboardTitle}>Monitoring Overview</h2>
          </div>
        </div>
        <div ref={notificationsRef} className="relative z-40">
          <div className={styles.greetingPill}>
            <button
              type="button"
              onClick={onToggleNotifications}
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={isNotificationsOpen}
              title={notificationTitle}
              className="relative text-slate-300 hover:text-cyan-300"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
              ) : null}
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-[#25374c] dark:text-slate-200">
              Hello, {user.firstName}!
            </span>
            <span className={styles.initialsChip}>{initials}</span>
          </div>
          <div
            className={clsx(
              "absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] origin-top-right rounded-xl border border-[#c3d4e8] bg-[#ffffff]/96 p-3.5 text-[#233549] shadow-[0_24px_44px_-30px_rgba(0,0,0,0.25)] backdrop-blur z-50 transition duration-200 ease-in-out dark:border-[#1d2b43] dark:bg-[#0a1220]/95 dark:text-inherit dark:shadow-[0_24px_44px_-30px_rgba(0,0,0,0.95)]",
              isNotificationsOpen
                ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
                : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
            )}
            aria-hidden={!isNotificationsOpen}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-[#60748e] dark:text-slate-400">Notifications</p>
              {notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={onClearNotifications}
                  className="text-xs uppercase tracking-[0.2em] text-[#60748e] dark:text-slate-400"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-sm text-[#60748e] dark:text-slate-400">No new alerts yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {notifications.map((alert) => {
                  const alertSourceUrl = getAlertSourceUrl(alert);
                  return (
                    <div
                      key={`notify-${alert.id}`}
                      className="rounded-lg border border-[#c3d4e8] bg-[#f5f9ff] px-3 py-2 dark:border-[#1b2d4a] dark:bg-[#070f1b]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#1c3048] dark:text-slate-100">
                          {alertSourceUrl ? (
                            <a href={alertSourceUrl} className="text-cyan-300 hover:underline">
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
                      <div className="mt-2 flex items-center justify-between text-xs text-[#60748e] dark:text-slate-400">
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
      </div>
      <div className={styles.kpiGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={styles.kpiCard}>
            <div className="flex items-start justify-between gap-2">
              <p className={styles.kpiLabel}>{card.label}</p>
              <span
                className={clsx(
                  styles.kpiIcon,
                  card.tone === "critical"
                    ? "text-cyan-300/90"
                    : card.tone === "warning"
                      ? "text-amber-300/90"
                      : card.tone === "ok"
                        ? "text-emerald-300/90"
                        : "text-slate-300/90"
                )}
              >
                {card.icon}
              </span>
            </div>
            <p className={styles.kpiValue}>{card.value}</p>
            <p className={styles.kpiMeta}>{card.meta}</p>
          </article>
        ))}
      </div>
    </header>
  );
}
