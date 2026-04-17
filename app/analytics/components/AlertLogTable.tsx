import FilterSelect from "../../../components/FilterSelect";
import type { Alert } from "../../../lib/types";
import { alertLogPageOptions } from "../constants";

type AlertLogTableProps = {
  alertLogSlice: Alert[];
  alertLogQuery: string;
  onQueryChange: (value: string) => void;
  alertLogTotal: number;
  alertLogPageSize: number;
  alertLogPageSafe: number;
  alertLogPageCount: number;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  getAlertSourceUrl: (alert: Alert) => string | null;
};

export default function AlertLogTable({
  alertLogSlice,
  alertLogQuery,
  onQueryChange,
  alertLogTotal,
  alertLogPageSize,
  alertLogPageSafe,
  alertLogPageCount,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  getAlertSourceUrl
}: AlertLogTableProps) {
  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-border bg-surface/92 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Detailed Report</p>
          <h3 className="mt-1 text-lg font-semibold text-text">Alert log</h3>
        </div>
        <div className="w-full max-w-full sm:max-w-xs lg:max-w-sm">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M20 20l-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              value={alertLogQuery}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search time, alert, severity, instance"
              aria-label="Search alert log"
              className="w-full rounded-lg border border-border bg-base/35 py-2 pl-9 pr-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted">
          <span>Last 30 days - {alertLogTotal} alerts</span>
          <FilterSelect
            value={String(alertLogPageSize)}
            onChange={(value) => {
              const nextValue = Number(value);
              if (!Number.isFinite(nextValue)) {
                return;
              }
              onPageSizeChange(nextValue);
            }}
            options={alertLogPageOptions}
            ariaLabel="Alert log page size"
            className="rounded-lg border border-border bg-base/35 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-text"
            optionClassName="text-[11px] uppercase tracking-[0.14em]"
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-base/35 text-[11px] uppercase tracking-[0.14em] text-muted">
          <tr>
            <th className="px-4 py-3 text-left">Instance label</th>
            <th className="px-4 py-3 text-left">Severity</th>
            <th className="px-4 py-3 text-left">Host</th>
            <th className="px-4 py-3 text-left">Alert</th>
            <th className="px-4 py-3 text-left">Event time</th>
          </tr>
        </thead>
        <tbody>
          {alertLogSlice.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-sm text-muted sm:px-4 sm:py-6">
                {alertLogQuery ? "No alerts match your search." : "No alerts available yet."}
              </td>
            </tr>
          ) : (
            alertLogSlice.map((alert) => {
              const alertSourceUrl = getAlertSourceUrl(alert);
              return (
                <tr key={alert.id} className="border-t border-border bg-surface/92">
                  <td className="px-4 py-3 font-semibold text-text">{alert.sourceLabel || alert.source}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        alert.severity === "critical"
                          ? "rounded-full bg-red-500/15 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-red-300"
                          : alert.severity === "warning"
                            ? "rounded-full bg-yellow-400/20 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-yellow-300"
                            : "rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-300"
                      }
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{alert.instance || "-"}</td>
                  <td className="px-4 py-3">
                    {alertSourceUrl ? (
                      <a href={alertSourceUrl} className="text-accent hover:underline">
                        {alert.name}
                      </a>
                    ) : (
                      <span className="text-text">{alert.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(alert.timestamp).toLocaleString()}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-muted sm:px-6 sm:py-4">
        <span>
          {alertLogTotal === 0
            ? "Showing 0"
            : `Showing ${(alertLogPageSafe - 1) * alertLogPageSize + 1}-${Math.min(
                alertLogPageSafe * alertLogPageSize,
                alertLogTotal
              )} of ${alertLogTotal}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevPage}
            disabled={alertLogPageSafe <= 1}
            className="rounded-lg border border-border bg-base/35 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {alertLogPageSafe} / {alertLogPageCount}
          </span>
          <button
            type="button"
            onClick={onNextPage}
            disabled={alertLogPageSafe >= alertLogPageCount}
            className="rounded-lg border border-border bg-base/35 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-text disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
