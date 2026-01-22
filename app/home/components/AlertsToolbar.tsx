import clsx from "clsx";

import FilterSelect from "../../../components/FilterSelect";
import type { SeverityOption, SourceOption, ViewMode } from "../constants";
import styles from "../../page.module.css";

type AlertsToolbarProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  filterSource: SourceOption;
  filterSeverity: SeverityOption;
  sourceFilterOptions: Array<{ value: string; label: string }>;
  severityFilterOptions: Array<{ value: string; label: string }>;
  onFilterSourceChange: (value: SourceOption) => void;
  onFilterSeverityChange: (value: SeverityOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  isLoadingAlerts: boolean;
  onRefresh: () => void;
  activeCount: number;
};

export default function AlertsToolbar({
  searchTerm,
  onSearchTermChange,
  searchInputRef,
  filterSource,
  filterSeverity,
  sourceFilterOptions,
  severityFilterOptions,
  onFilterSourceChange,
  onFilterSeverityChange,
  viewMode,
  onViewModeChange,
  isLoadingAlerts,
  onRefresh,
  activeCount
}: AlertsToolbarProps) {
  return (
    <div className={styles.latestHeader}>
      <div className={styles.latestTitle}>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Alerts</p>
        <h3 className="text-xl font-semibold">Current Alerts</h3>
        <p className={styles.latestMeta}>Active alerts: {activeCount}</p>
      </div>
      <div className={styles.latestMiddle}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
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
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            ref={searchInputRef}
            placeholder="(/ to search, Esc to clear)"
            aria-label="Search alerts"
            className={styles.searchInput}
          />
        </div>
        <div className={styles.latestFilters}>
          <FilterSelect
            value={filterSource}
            onChange={(value) => onFilterSourceChange(value as SourceOption)}
            options={sourceFilterOptions}
            ariaLabel="Source filter"
            className={styles.filterSelect}
            optionClassName="text-sm"
          />
          <FilterSelect
            value={filterSeverity}
            onChange={(value) => onFilterSeverityChange(value as SeverityOption)}
            options={severityFilterOptions}
            ariaLabel="Severity filter"
            className={styles.filterSelect}
            optionClassName="text-sm"
          />
        </div>
      </div>
      <div className={styles.latestActions}>
        <div className={styles.viewToggle}>
          <button
            type="button"
            onClick={() => onViewModeChange("cards")}
            className={clsx(
              styles.viewToggleButton,
              viewMode === "cards" ? "bg-accent text-white" : "text-muted"
            )}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={clsx(
              styles.viewToggleButton,
              viewMode === "table" ? "bg-accent text-white" : "text-muted"
            )}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("split")}
            className={clsx(
              styles.viewToggleButton,
              viewMode === "split" ? "bg-accent text-white" : "text-muted"
            )}
          >
            Split
          </button>
        </div>
        <button type="button" onClick={onRefresh} className={styles.refreshButton}>
          {isLoadingAlerts ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
