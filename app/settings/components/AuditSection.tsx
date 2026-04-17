import { useMemo, useState } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faUser,
  faBoxArchive,
  faClockRotateLeft
} from "@fortawesome/free-solid-svg-icons";

import PageSectionHeader from "../../../components/PageSectionHeader";
import FilterSelect from "../../../components/FilterSelect";
import type { AuditLogEntry } from "../types";
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsMutedButton,
  settingsPanelCard,
  settingsShellCard
} from "./theme";

type AuditSectionProps = {
  headerRight?: React.ReactNode;
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

function formatAction(action: string) {
  return action.replace(/\./g, " - ").toUpperCase();
}

function resourceFromAction(action: string) {
  if (action.startsWith("users.")) return "users";
  if (action.startsWith("settings.")) return "settings";
  if (action.startsWith("auth.")) return "authentication";
  if (action.startsWith("sources.")) return "data-source";
  if (action.startsWith("audit.")) return "audit";
  return action.split(".")[0] || "system";
}

export default function AuditSection({
  headerRight,
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
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const pageOptions = [10, 25, 50, 100].map((value) => ({
    value: String(value),
    label: `${value}/page`
  }));

  const actionOptions = useMemo(() => {
    const values = Array.from(new Set(auditLogs.map((entry) => entry.action)));
    return [{ value: "all", label: "All Actions" }, ...values.map((value) => ({ value, label: value }))];
  }, [auditLogs]);

  const resourceOptions = useMemo(() => {
    const values = Array.from(new Set(auditLogs.map((entry) => resourceFromAction(entry.action))));
    return [{ value: "all", label: "All Resources" }, ...values.map((value) => ({ value, label: value }))];
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      const resource = resourceFromAction(entry.action);
      if (resourceFilter !== "all" && resource !== resourceFilter) return false;
      const createdAt = new Date(entry.createdAt);
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (createdAt < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59`);
        if (createdAt > end) return false;
      }
      return true;
    });
  }, [actionFilter, auditLogs, endDate, resourceFilter, startDate]);

  return (
    <section className="space-y-4">
      <PageSectionHeader
        icon={faClockRotateLeft}
        title="Audit Trail"
        subtitle="Track and monitor all activities across your infrastructure."
        right={headerRight}
      />

      <div className={clsx(settingsPanelCard, "p-4")}>
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-text">
            <FontAwesomeIcon icon={faFilter} className="h-3.5 w-3.5 text-accent" />
            Filters
          </div>
          <button
            type="button"
            onClick={() => {
              setActionFilter("all");
              setResourceFilter("all");
              setStartDate("");
              setEndDate("");
            }}
            className={settingsMutedButton}
          >
            Clear All
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
          <FilterSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={actionOptions}
            ariaLabel="Action filter"
            className={clsx("h-12 w-full rounded-xl", settingsFieldClass)}
            optionClassName="text-sm"
          />
          <FilterSelect
            value={resourceFilter}
            onChange={setResourceFilter}
            options={resourceOptions}
            ariaLabel="Resource filter"
            className={clsx("h-12 w-full rounded-xl", settingsFieldClass)}
            optionClassName="text-sm"
          />
          <FilterSelect
            value={String(auditPageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageOptions}
            ariaLabel="Audit page size"
            className={clsx("h-12 w-full rounded-xl", settingsFieldClass)}
            optionClassName="text-sm"
          />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className={settingsLabelClass}>Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={settingsFieldClass}
            />
          </label>
          <label className="space-y-2">
            <span className={settingsLabelClass}>End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className={settingsFieldClass}
            />
          </label>
        </div>
      </div>

      {auditStatus ? <p className="text-sm text-muted">{auditStatus}</p> : null}

      <div className={clsx(settingsShellCard, "overflow-hidden")}>
        {isLoadingAudit ? (
          <p className="px-6 py-8 text-sm text-muted">Loading audit log...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-border bg-base/70">
              <tr>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Action
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Actor
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Resource
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const resource = resourceFromAction(log.action);
                return (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-4 py-3 text-left text-sm text-text">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-left">
                      <span className="inline-flex rounded-lg border border-border bg-base/80 px-2 py-1 text-[11px] font-semibold text-text">
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="inline-flex items-center gap-2 text-sm text-text">
                        <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5 text-muted" />
                        {log.userName ?? "System"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base/80 px-2 py-1 text-[11px] font-semibold text-text">
                        <FontAwesomeIcon icon={faBoxArchive} className="h-3 w-3 text-muted" />
                        {resource}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <span className="inline-flex max-w-[320px] items-center justify-start text-xs text-muted" title={formatAuditDetails(log.details)}>
                        <span className="truncate">{formatAuditDetails(log.details)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between border-t border-border bg-base/40 px-4 py-3 text-sm text-muted">
          <span>
            {auditTotal === 0
              ? "Showing 0 to 0 of 0"
              : `Showing ${(auditPage - 1) * auditPageSize + 1} to ${Math.min(
                  auditPage * auditPageSize,
                  auditTotal
                )} of ${auditTotal}`}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onRefresh} className={settingsMutedButton}>
              Refresh
            </button>
            <button
              type="button"
              onClick={onPrevPage}
              disabled={auditPage <= 1}
              className={clsx(settingsMutedButton, "disabled:opacity-50")}
            >
              Previous
            </button>
            <span className="rounded-xl border border-border bg-base/80 px-3 py-2 text-[11px] font-bold text-text">
              Page {auditPage} of {auditPageCount}
            </span>
            <button
              type="button"
              onClick={onNextPage}
              disabled={auditPage >= auditPageCount}
              className={clsx(settingsMutedButton, "disabled:opacity-50")}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
