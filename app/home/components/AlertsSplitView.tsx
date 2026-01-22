import clsx from "clsx";

import type { Alert } from "../../../lib/types";

export type AlertsSplitViewProps = {
  alerts: Alert[];
  selectedAlertId: string | null;
  selectedAlert: Alert | null;
  selectedAlertStatus: "active" | "acknowledged" | "resolved";
  selectedAlertSourceUrl: string | null;
  selectedAlertIds: Set<string>;
  listItemRefs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  alertNoteDraft: string;
  onAlertNoteChange: (value: string) => void;
  onSelectAlert: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onUpdateAlertState: (alertId: string, status: "active" | "acknowledged" | "resolved") => void;
  getAlertSourceUrl: (alert: Alert) => string | null;
};

export default function AlertsSplitView({
  alerts,
  selectedAlertId,
  selectedAlert,
  selectedAlertStatus,
  selectedAlertSourceUrl,
  selectedAlertIds,
  listItemRefs,
  alertNoteDraft,
  onAlertNoteChange,
  onSelectAlert,
  onToggleSelection,
  onUpdateAlertState,
  getAlertSourceUrl
}: AlertsSplitViewProps) {
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Alert list</p>
          <span className="text-xs uppercase tracking-[0.2em] text-muted">
            {alerts.length} results
          </span>
        </div>
        {alerts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-base/40 p-4 text-center text-sm text-muted sm:p-6">
            No alerts match your filters.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {alerts.map((alert) => {
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
                  onClick={() => onSelectAlert(alert.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectAlert(alert.id);
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
      <div className="rounded-2xl border border-border bg-surface/90 p-4 shadow-card sm:p-6">
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
                  <p className="mt-2 text-sm font-semibold capitalize">{selectedAlertStatus}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateAlertState(selectedAlert.id, "acknowledged")}
                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                  >
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAlertState(selectedAlert.id, "resolved")}
                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                  >
                    Resolve
                  </button>
                  {selectedAlertStatus !== "active" ? (
                    <button
                      type="button"
                      onClick={() => onUpdateAlertState(selectedAlert.id, "active")}
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
                  onClick={() => onUpdateAlertState(selectedAlert.id, selectedAlertStatus)}
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
          <div className="mt-4 rounded-xl border border-border bg-base/40 p-4 text-center text-sm text-muted sm:p-6">
            Select an alert from the list to view details.
          </div>
        )}
      </div>
    </div>
  );
}
