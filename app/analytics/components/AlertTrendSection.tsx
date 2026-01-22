import AlertChart from "../../../components/AlertChart";
import FilterSelect from "../../../components/FilterSelect";
import type { AnalyticsSummary, TrendDatum, TrendRange } from "../../../lib/analytics";
import { trendRanges } from "../constants";

type AlertTrendSectionProps = {
  trendRange: TrendRange;
  onTrendRangeChange: (value: TrendRange) => void;
  trendMonth: string;
  onTrendMonthChange: (value: string) => void;
  monthOptions: Array<{ value: string; label: string }>;
  alertsCount: number;
  trendData: TrendDatum[];
  counts: AnalyticsSummary["counts"];
};

export default function AlertTrendSection({
  trendRange,
  onTrendRangeChange,
  trendMonth,
  onTrendMonthChange,
  monthOptions,
  alertsCount,
  trendData,
  counts
}: AlertTrendSectionProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Alert Trend</p>
          <h3 className="mt-2 text-2xl font-semibold">Alert trendline</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {trendRanges.map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => onTrendRangeChange(range.value)}
              className={
                trendRange === range.value
                  ? "rounded-full border border-accent bg-accent px-3 py-1 text-xs uppercase tracking-[0.2em] text-white"
                  : "rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
              }
            >
              {range.label}
            </button>
          ))}
          {trendRange === "month" ? (
            <FilterSelect
              value={trendMonth}
              onChange={(value) => onTrendMonthChange(value)}
              options={monthOptions}
              ariaLabel="Trend month"
              className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em]"
              optionClassName="text-xs uppercase tracking-[0.2em]"
            />
          ) : null}
          <span className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
            {alertsCount} total
          </span>
        </div>
      </div>
      <AlertChart data={trendData} />
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Day", last: counts.lastDay, current: counts.currentDay },
          { label: "Month", last: counts.lastMonth, current: counts.currentMonth },
          { label: "Year", last: counts.lastYear, current: counts.currentYear }
        ].map((row) => (
          <div key={row.label} className="rounded-2xl border border-border bg-base/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{row.label}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted">Last</span>
              <span className="font-semibold">{row.last}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Current</span>
              <span className="font-semibold">{row.current}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
