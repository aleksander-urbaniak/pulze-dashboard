import type { Alert } from "../../../lib/types";

type AlertsBulkActionsProps = {
  filteredAlerts: Alert[];
  selectedAlertIds: Set<string>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExportAlerts: (alerts: Alert[]) => void;
  onBulkUpdate: (status: "acknowledged" | "resolved") => void;
};

export default function AlertsBulkActions({
  filteredAlerts,
  selectedAlertIds,
  onSelectAll,
  onClearSelection,
  onExportAlerts,
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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted sm:px-4 sm:py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
        {hasSelection ? (
          <span className="text-xs uppercase tracking-[0.2em] text-muted">
            {selectedAlertIds.size} selected
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const target = hasSelection
              ? filteredAlerts.filter((alert) => selectedAlertIds.has(alert.id))
              : filteredAlerts;
            onExportAlerts(target);
          }}
          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
        >
          Export CSV
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => onBulkUpdate("acknowledged")}
          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          Acknowledge
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={() => onBulkUpdate("resolved")}
          className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
        >
          Resolve
        </button>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
