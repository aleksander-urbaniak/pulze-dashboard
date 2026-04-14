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
  const formatCardTimestamp = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

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
          <div className="col-span-full rounded-xl border border-[#1a2d4a] bg-[#070f1b]/85 p-6 text-center text-sm text-slate-400">
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
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectAlert(alert.id);
                  }
                }}
                className={clsx(
                  styles.card,
                  expandedAlertId && !isExpanded ? styles.cardMuted : null,
                  isExpanded ? styles.cardExpanded : null,
                  isSelected ? styles.cardSelected : null,
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
                    "absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-md border text-[10px]",
                    isSelected
                      ? "border-cyan-300 bg-cyan-300 text-[#03161a]"
                      : "border-[#1d2f4c] bg-[#081325] text-slate-400"
                  )}
                >
                  {isSelected ? "✓" : ""}
                </button>
                {alert.groupSize && alert.groupSize > 1 ? (
                  <span className="absolute right-12 top-4 rounded-full border border-[#1d2f4c] bg-[#081325] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                    x{alert.groupSize}
                  </span>
                ) : null}
                <div className="flex items-center justify-between gap-3 pr-20">
                  <p className={clsx("text-xs font-bold uppercase tracking-[0.24em]", styles.cardSeverityLabel)}>
                    <span className={styles.severityDot} />
                    {alert.severity}
                  </p>
                  <span className="max-w-[60%] truncate rounded-lg border border-[#1d2f4c] bg-[#081325] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                    {instanceLabel}
                  </span>
                </div>
                {alert.ackStatus && alert.ackStatus !== "active" ? (
                  <span
                    className={clsx(
                      "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                      alert.ackStatus === "acknowledged"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    )}
                  >
                    {alert.ackStatus}
                  </span>
                ) : null}
                <h3 className="mt-4 text-[1.35rem] font-semibold leading-tight text-slate-100 break-words">
                  {alertSourceUrl ? (
                    <a
                      href={alertSourceUrl}
                      className="text-slate-100 hover:text-cyan-300"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {alert.name}
                    </a>
                  ) : (
                    alert.name
                  )}
                </h3>
                {alert.instance ? (
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500 break-words">
                    {alert.instance}
                  </p>
                ) : null}
                <p className="mt-2.5 text-[13px] leading-relaxed text-slate-400 break-words">{alert.message}</p>
                {notePreview && !isExpanded ? (
                  <p className={styles.cardNotePreview}>Note: {notePreview}</p>
                ) : null}
                <div className="mt-5 flex items-center justify-between border-t border-[#15243d] pt-3 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <span>{formatCardTimestamp(alert.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleExpanded(alert.id);
                      }}
                      className="rounded-md border border-transparent p-1.5 text-slate-500 hover:border-[#1d2f4c] hover:text-cyan-300"
                      title="View details"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUpdateAlertState(alert.id, "resolved");
                      }}
                      disabled={!canAcknowledge}
                      className="rounded-md border border-transparent p-1.5 text-slate-500 hover:border-[#1d2f4c] hover:text-rose-300 disabled:opacity-50"
                      title="Resolve alert"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <div
                  className={clsx(styles.cardDetail, isExpanded ? styles.cardDetailOpen : null)}
                  onClick={(event) => event.stopPropagation()}
                  aria-hidden={!isExpanded}
                >
                  <div className="rounded-xl border border-[#1a2d4a] bg-[#060e1c]/95 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                        <p className="mt-2 text-sm font-semibold capitalize text-slate-200">{alertStatus}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateAlertState(alert.id, "acknowledged")}
                          disabled={!canAcknowledge}
                          className="rounded-xl border border-[#1d2f4c] bg-[#071021] px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateAlertState(alert.id, "resolved")}
                          disabled={!canAcknowledge}
                          className="rounded-xl border border-emerald-400/40 bg-emerald-400/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#02110d]"
                        >
                          Resolve
                        </button>
                        {alertStatus !== "active" ? (
                          <button
                            type="button"
                            onClick={() => onUpdateAlertState(alert.id, "active")}
                            disabled={!canAcknowledge}
                            className="rounded-xl border border-[#1d2f4c] bg-[#071021] px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400"
                          >
                            Reopen
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Note</label>
                      <textarea
                        value={alertNoteDraft}
                        onChange={(event) => onAlertNoteChange(event.target.value)}
                        placeholder="Add acknowledgment notes..."
                        className="h-24 w-full rounded-xl border border-[#1d2f4c] bg-[#071021] px-3 py-2 text-sm text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateAlertState(alert.id, alertStatus)}
                        disabled={!canAcknowledge}
                        className="rounded-xl border border-[#1d2f4c] bg-[#071021] px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200"
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
