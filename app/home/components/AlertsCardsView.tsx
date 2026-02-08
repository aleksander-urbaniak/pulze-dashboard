import clsx from "clsx";

import type { Alert } from "../../../lib/types";
import styles from "../../page.module.css";

type AlertsCardsViewProps = {
  alerts: Alert[];
  expandedAlertId: string | null;
  selectedAlertIds: Set<string>;
  alertNoteDraft: string;
  onAlertNoteChange: (value: string) => void;
  onSelectAlert: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onCloseExpanded: () => void;
  onToggleSelection: (id: string) => void;
  onUpdateAlertState: (alertId: string, status: "active" | "acknowledged" | "resolved") => void;
  getAlertSourceUrl: (alert: Alert) => string | null;
  canAcknowledge: boolean;
};

export default function AlertsCardsView({
  alerts,
  expandedAlertId,
  selectedAlertIds,
  alertNoteDraft,
  onAlertNoteChange,
  onSelectAlert,
  onToggleExpanded,
  onCloseExpanded,
  onToggleSelection,
  onUpdateAlertState,
  getAlertSourceUrl,
  canAcknowledge
}: AlertsCardsViewProps) {
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-label="Close expanded alert"
        onClick={onCloseExpanded}
        tabIndex={expandedAlertId ? 0 : -1}
        aria-hidden={!expandedAlertId}
        className={clsx(styles.focusOverlay, expandedAlertId ? styles.focusOverlayVisible : null)}
      />
      <div className={styles.cardGrid}>
        {alerts.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-border bg-base/40 p-8 text-center text-sm text-muted">
            No alerts match your filters.
          </div>
        ) : (
          alerts.map((alert) => {
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
                    onToggleSelection(alert.id);
                  }}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? "Deselect alert" : "Select alert"}
                  className={clsx(
                    "absolute left-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                    isSelected ? "border-accent bg-accent text-white" : "border-border bg-base/80 text-muted"
                  )}
                >
                  {isSelected ? "x" : ""}
                </button>
                <span className="absolute right-4 top-4 max-w-[60%] truncate rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold text-accent">
                  {instanceLabel}
                </span>
                {alert.groupSize && alert.groupSize > 1 ? (
                  <span className="absolute left-12 top-4 rounded-full border border-border bg-base/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted">
                    x{alert.groupSize}
                  </span>
                ) : null}
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
                  <p className={styles.cardNotePreview}>Note: {notePreview}</p>
                ) : null}
                <p className="mt-6 text-xs text-muted">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
                <div
                  className={clsx(styles.cardDetail, isExpanded ? styles.cardDetailOpen : null)}
                  onClick={(event) => event.stopPropagation()}
                  aria-hidden={!isExpanded}
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
                          disabled={!canAcknowledge}
                          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateAlertState(alert.id, "resolved")}
                          disabled={!canAcknowledge}
                          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                        >
                          Resolve
                        </button>
                        {alertStatus !== "active" ? (
                          <button
                            type="button"
                            onClick={() => onUpdateAlertState(alert.id, "active")}
                            disabled={!canAcknowledge}
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
                        disabled={!canAcknowledge}
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
  );
}
