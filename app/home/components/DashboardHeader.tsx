import { useMemo } from "react";
import clsx from "clsx";

import type { Alert, User } from "../../../lib/types";

type DashboardHeaderProps = {
  user: User;
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
  notifications,
  newAlertCount,
  isNotificationsOpen,
  notificationsRef,
  onToggleNotifications,
  onClearNotifications,
  getAlertSourceUrl
}: DashboardHeaderProps) {
  const notificationTitle = useMemo(() => {
    if (newAlertCount > 0) {
      return `${newAlertCount} new alerts`;
    }
    return "No new alerts";
  }, [newAlertCount]);

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <div className="flex flex-col items-center sm:items-start">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Dashboard</p>
        <h2 className="text-2xl font-semibold">Monitoring Overview</h2>
      </div>
      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:w-auto sm:justify-end">
        <div ref={notificationsRef} className="relative z-40">
          <button
            type="button"
            onClick={onToggleNotifications}
            className="relative rounded-full border border-border bg-surface/80 p-2"
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={isNotificationsOpen}
            title={notificationTitle}
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
              "absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur z-50 transition duration-200 ease-in-out",
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
                  onClick={onClearNotifications}
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
  );
}
