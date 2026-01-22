import { Fragment } from "react";
import clsx from "clsx";

import type { Alert } from "../../../lib/types";
import styles from "../../page.module.css";

type AlertsTableViewProps = {
  alerts: Alert[];
  expandedAlertId: string | null;
  selectedAlertIds: Set<string>;
  alertNoteDraft: string;
  onAlertNoteChange: (value: string) => void;
  onSelectAlert: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onUpdateAlertState: (alertId: string, status: "active" | "acknowledged" | "resolved") => void;
  getAlertSourceUrl: (alert: Alert) => string | null;
};

export default function AlertsTableView({
  alerts,
  expandedAlertId,
  selectedAlertIds,
  alertNoteDraft,
  onAlertNoteChange,
  onSelectAlert,
  onToggleExpanded,
  onToggleSelection,
  onUpdateAlertState,
  getAlertSourceUrl
}: AlertsTableViewProps) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface/90 shadow-card">
      <table className="min-w-[720px] w-full table-fixed text-sm">
        <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
          <tr>
            <th className="w-20 px-4 py-3 text-left">Select</th>
            <th className="w-32 px-4 py-3 text-left">Instance label</th>
            <th className="w-28 px-4 py-3 text-left">Severity</th>
            <th className="w-24 px-4 py-3 text-left">State</th>
            <th className="w-56 px-4 py-3 text-left">Host</th>
            <th className="px-4 py-3 text-left">Alert</th>
            <th className="w-40 px-4 py-3 text-left">Event time</th>
          </tr>
        </thead>
        <tbody>
          {alerts.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-sm text-muted sm:px-4 sm:py-6">
                No alerts match your filters.
              </td>
            </tr>
          ) : (
            alerts.map((alert) => {
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
                      onSelectAlert(alert.id);
                      onToggleExpanded(alert.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectAlert(alert.id);
                        onToggleExpanded(alert.id);
                      }
                    }}
                    className={clsx("border-t border-border bg-base/40", isExpanded ? styles.tableRowActive : null)}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleSelection(alert.id);
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
                    <td className="px-4 py-3 font-semibold break-words">
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
                    <td className="px-4 py-3 text-muted break-words">{alert.instance || "-"}</td>
                    <td className="px-4 py-3 break-words">
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
                    <td className="px-4 py-3 text-muted">{new Date(alert.timestamp).toLocaleString()}</td>
                  </tr>
                  <tr className={styles.tableDetailRow} aria-hidden={!isExpanded}>
                    <td
                      colSpan={7}
                      className={clsx(
                        styles.tableDetailCell,
                        !isExpanded ? styles.tableDetailCellCollapsed : null
                      )}
                    >
                      <div
                        className={clsx(styles.tableDetail, isExpanded ? styles.tableDetailOpen : null)}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="rounded-xl border border-border bg-base/40 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-muted">Status</p>
                              <p className="mt-2 text-sm font-semibold capitalize">{alertStatus}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onUpdateAlertState(alert.id, "acknowledged")}
                                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                              >
                                Acknowledge
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateAlertState(alert.id, "resolved")}
                                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                              >
                                Resolve
                              </button>
                              {alertStatus !== "active" ? (
                                <button
                                  type="button"
                                  onClick={() => onUpdateAlertState(alert.id, "active")}
                                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                                >
                                  Reopen
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <label className="text-xs uppercase tracking-[0.2em] text-muted">Note</label>
                            <textarea
                              value={alertNoteDraft}
                              onChange={(event) => onAlertNoteChange(event.target.value)}
                              placeholder="Add acknowledgment notes..."
                              className="h-24 w-full rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => onUpdateAlertState(alert.id, alertStatus)}
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
  );
}
