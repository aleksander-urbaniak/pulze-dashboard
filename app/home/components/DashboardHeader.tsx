import { useMemo } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGaugeHigh } from "@fortawesome/free-solid-svg-icons";

import type { Alert, User } from "../../../lib/types";
import UserGreetingPill from "../../../components/UserGreetingPill";
import styles from "../../page.module.css";

type DashboardHeaderProps = {
  user: User;
  alerts: Alert[];
  disappearedEvents: Array<{
    id: string;
    source: string;
    startedAt: string;
    disappearedAt: string;
    durationMinutes: number;
  }>;
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
  disappearedEvents,
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
    const latestAlert = alerts.reduce((max, alert) => {
      const value = Date.parse(alert.timestamp);
      if (!Number.isFinite(value)) {
        return max;
      }
      return Math.max(max, value);
    }, 0);
    const latestDisappeared = disappearedEvents.reduce((max, event) => {
      const value = Date.parse(event.disappearedAt);
      if (!Number.isFinite(value)) {
        return max;
      }
      return Math.max(max, value);
    }, 0);
    const latest = Math.max(latestAlert, latestDisappeared);
    return latest > 0 ? latest : null;
  }, [alerts, disappearedEvents]);

  const activeLastHour = useMemo(() => {
    if (!referenceTimestamp) {
      return 0;
    }
    const cutoff = referenceTimestamp - 60 * 60 * 1000;
    return unresolvedAlerts.filter((alert) => Date.parse(alert.timestamp) >= cutoff).length;
  }, [referenceTimestamp, unresolvedAlerts]);

  const sourceStats = useMemo(() => {
    const cutoff24 = referenceTimestamp ? referenceTimestamp - 24 * 60 * 60 * 1000 : null;
    const statsMap = new Map<
      string,
      {
        unresolved: number;
        critical: number;
        warning: number;
        resolved24: number;
        resolutionTotalMinutes: number;
        resolutionCount: number;
      }
    >();

    const getEntry = (sourceName: string) => {
      const existing = statsMap.get(sourceName);
      if (existing) {
        return existing;
      }
      const created = {
        unresolved: 0,
        critical: 0,
        warning: 0,
        resolved24: 0,
        resolutionTotalMinutes: 0,
        resolutionCount: 0
      };
      statsMap.set(sourceName, created);
      return created;
    };

    alerts.forEach((alert) => {
      const sourceName = alert.sourceLabel?.trim() || alert.source || "Unknown";
      const entry = getEntry(sourceName);
      entry.unresolved += 1;
      if (alert.severity === "critical") {
        entry.critical += 1;
      } else if (alert.severity === "warning") {
        entry.warning += 1;
      }
    });

    disappearedEvents.forEach((event) => {
      const sourceName = event.source?.trim() || "Unknown";
      const entry = getEntry(sourceName);
      if (Number.isFinite(event.durationMinutes) && event.durationMinutes >= 0) {
        entry.resolutionTotalMinutes += event.durationMinutes;
        entry.resolutionCount += 1;
      }
      const disappearedTimestamp = Date.parse(event.disappearedAt);
      if (cutoff24 && Number.isFinite(disappearedTimestamp) && disappearedTimestamp >= cutoff24) {
        entry.resolved24 += 1;
      }
    });

    return Array.from(statsMap.entries()).map(([source, entry]) => ({
      source,
      ...entry,
      avgResolutionMinutes:
        entry.resolutionCount > 0
          ? Math.round(entry.resolutionTotalMinutes / entry.resolutionCount)
          : 0
    }));
  }, [alerts, disappearedEvents, referenceTimestamp]);

  const avgResolutionMinutes = useMemo(() => {
    const withResolution = sourceStats.filter((entry) => entry.resolutionCount > 0);
    if (withResolution.length === 0) {
      return 0;
    }
    const totalMinutes = withResolution.reduce((sum, entry) => sum + entry.resolutionTotalMinutes, 0);
    const totalCount = withResolution.reduce((sum, entry) => sum + entry.resolutionCount, 0);
    if (totalCount === 0) {
      return 0;
    }
    return Math.round(totalMinutes / totalCount);
  }, [sourceStats]);

  const resolvedTodayCount = useMemo(
    () => sourceStats.reduce((sum, source) => sum + source.resolved24, 0),
    [sourceStats]
  );

  const totalResolutionCount = useMemo(
    () => sourceStats.reduce((sum, source) => sum + source.resolutionCount, 0),
    [sourceStats]
  );

  const alertPressure = useMemo(() => {
    const raw = criticalCount * 18 + warningCount * 9 + Math.min(activeLastHour, 20) * 2;
    return Math.max(0, Math.min(99, Math.round(raw)));
  }, [activeLastHour, criticalCount, warningCount]);

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
      meta: totalResolutionCount > 0 ? `based on ${totalResolutionCount} resolved alerts` : "no resolved incidents yet",
      tone: "ok" as const,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    },
    {
      label: "Alert Pressure",
      value: `${alertPressure}%`,
      meta:
        criticalCount > 0
          ? `${criticalCount} critical, ${warningCount} warning`
          : warningCount > 0
            ? `${warningCount} warning alerts active`
            : "stable",
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
      meta: resolvedTodayCount > 0 ? "alerts disappeared in last 24h" : "no alerts disappeared recently",
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
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faGaugeHigh} className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-[2.2rem] font-semibold leading-none text-text">Dashboard</h2>
        </div>
        <div ref={notificationsRef} className="relative z-40">
          <UserGreetingPill
            user={user}
            notifications={notifications}
            newAlertCount={newAlertCount}
            isNotificationsOpen={isNotificationsOpen}
            onToggleNotifications={onToggleNotifications}
            onClearNotifications={onClearNotifications}
            getAlertSourceUrl={getAlertSourceUrl}
          />
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
                    ? "text-accent/90"
                    : card.tone === "warning"
                      ? "text-amber-300/90"
                      : card.tone === "ok"
                        ? "text-emerald-300/90"
                        : "text-muted/90"
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
