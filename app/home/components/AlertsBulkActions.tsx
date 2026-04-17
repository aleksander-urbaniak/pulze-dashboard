import type { Alert } from "../../../lib/types";

type AlertsBulkActionsProps = {
  filteredAlerts: Alert[];
  selectedAlertIds: Set<string>;
  criticalCount: number;
  warningCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExportAlerts: (alerts: Alert[]) => void;
  canAcknowledge: boolean;
  onBulkUpdate: (status: "acknowledged" | "resolved") => void;
};

export default function AlertsBulkActions({
  filteredAlerts,
  selectedAlertIds,
  criticalCount,
  warningCount,
  onSelectAll,
  onClearSelection,
  onExportAlerts,
  canAcknowledge,
  onBulkUpdate
}: AlertsBulkActionsProps) {
  if (filteredAlerts.length === 0) {
    return null;
  }
  const hasSelection = selectedAlertIds.size > 0;
  const allSelected = selectedAlertIds.size === filteredAlerts.length;
  const handleToggleSelectAll = () => {
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  };

  return (
    <div className="mt-4 grid items-center gap-3 px-1 py-1 text-xs uppercase tracking-[0.18em] text-muted sm:px-0 lg:grid-cols-[1fr_auto_1fr]">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="rounded-xl border border-border bg-surface/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text hover:border-accent/60"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          {hasSelection ? `${selectedAlertIds.size} selected` : `${filteredAlerts.length} total`}
        </span>
      </div>
      <div className="flex items-center justify-start gap-2 lg:justify-center">
        <span className="rounded-md border border-rose-500/45 bg-rose-500/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300">
          {criticalCount} Critical
        </span>
        <span className="rounded-md border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
          {warningCount} Warning
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => {
            const target = hasSelection
              ? filteredAlerts.filter((alert) => selectedAlertIds.has(alert.id))
              : filteredAlerts;
            onExportAlerts(target);
          }}
          className="rounded-xl border border-border bg-surface/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text hover:border-accent/60"
        >
          Export CSV
        </button>
        <button
          type="button"
          disabled={!hasSelection || !canAcknowledge}
          onClick={() => onBulkUpdate("acknowledged")}
          className="rounded-xl border border-border bg-surface/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-text hover:border-accent/60 disabled:opacity-50"
        >
          Acknowledge
        </button>
        <button
          type="button"
          disabled={!hasSelection || !canAcknowledge}
          onClick={() => onBulkUpdate("resolved")}
          className="rounded-xl border border-accent/35 bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-on-accent hover:brightness-110 disabled:opacity-50"
        >
          Resolve selected
        </button>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-xl border border-border bg-surface/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted hover:border-accent/60"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
