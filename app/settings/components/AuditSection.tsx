import FilterSelect from "../../../components/FilterSelect";
import type { AuditLogEntry } from "../types";

type AuditSectionProps = {
  auditLogs: AuditLogEntry[];
  auditStatus: string | null;
  isLoadingAudit: boolean;
  auditTotal: number;
  auditPage: number;
  auditPageSize: number;
  auditPageCount: number;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
  formatAuditDetails: (details: string) => string;
};

export default function AuditSection({
  auditLogs,
  auditStatus,
  isLoadingAudit,
  auditTotal,
  auditPage,
  auditPageSize,
  auditPageCount,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  onRefresh,
  formatAuditDetails
}: AuditSectionProps) {
  const pageOptions = [10, 25, 50, 100].map((value) => ({
    value: String(value),
    label: `${value}/page`
  }));

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Audit Log</p>
            <h2 className="text-2xl font-semibold">System activity</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
          >
            Refresh
          </button>
        </div>
        {auditStatus ? <p className="mt-3 text-sm text-muted">{auditStatus}</p> : null}
        {auditLogs.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs uppercase tracking-[0.2em] text-muted">
            <FilterSelect
              value={String(auditPageSize)}
              onChange={(value) => {
                const nextValue = Number(value);
                if (!Number.isFinite(nextValue)) {
                  return;
                }
                onPageSizeChange(nextValue);
              }}
              options={pageOptions}
              ariaLabel="Audit log page size"
              className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em]"
              optionClassName="text-xs uppercase tracking-[0.2em]"
            />
          </div>
        ) : null}
        {isLoadingAudit ? (
          <p className="mt-4 text-sm text-muted">Loading audit log...</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Details</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border bg-base/40">
                    <td className="px-4 py-3 font-semibold">{log.action}</td>
                    <td className="px-4 py-3 text-muted">
                      {log.userName ?? "System"}
                      {log.userEmail ? ` (${log.userEmail})` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      <pre className="whitespace-pre-wrap font-sans">
                        {formatAuditDetails(log.details)}
                      </pre>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {auditLogs.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-muted">
            <span>
              {auditTotal === 0
                ? "Showing 0"
                : `Showing ${(auditPage - 1) * auditPageSize + 1}-${Math.min(
                    auditPage * auditPageSize,
                    auditTotal
                  )} of ${auditTotal}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={auditPage <= 1}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {auditPage} / {auditPageCount}
              </span>
              <button
                type="button"
                onClick={onNextPage}
                disabled={auditPage >= auditPageCount}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
