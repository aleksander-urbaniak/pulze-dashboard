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
    <div className={styles.toolbarShell}>
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
            placeholder="Search alerts (id, title, source...)"
            aria-label="Search alerts"
            className={styles.searchInput}
          />
        </div>
        <div className={styles.latestFilters}>
          <FilterSelect
            value={filterSource}
            onChange={(value) => onFilterSourceChange(value as SourceOption)}
            options={sourceFilterOptions.map((option) => ({
              value: option.value,
              label: `Source: ${option.label.toUpperCase()}`
            }))}
            ariaLabel="Source filter"
            className={styles.filterSelect}
            optionClassName="text-sm"
          />
          <FilterSelect
            value={filterSeverity}
            onChange={(value) => onFilterSeverityChange(value as SeverityOption)}
            options={severityFilterOptions.map((option) => ({
              value: option.value,
              label: `Severity: ${option.label.toUpperCase()}`
            }))}
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
        <button type="button" onClick={onRefresh} className={styles.refreshButton} title="Refresh alerts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={isLoadingAlerts ? "animate-spin" : ""}>
            <path
              d="M20 12a8 8 0 1 1-2.35-5.65M20 4v5h-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className={styles.latestMeta}>Active: {activeCount}</span>
      </div>
    </div>
  );
}
