import type { AnalyticsSummary } from "../../../lib/analytics";
import { formatDuration } from "../utils";

type HistoricalAnalyticsCardProps = {
  analytics: AnalyticsSummary;
};

export default function HistoricalAnalyticsCard({ analytics }: HistoricalAnalyticsCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface/92 p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Historical analytics</p>
          <h3 className="mt-1.5 text-xl font-semibold text-text">MTTR, MTTA, frequency</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Based on active alerts</span>
      </div>
      <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-base/35 p-3.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">MTTA (proxy)</p>
          <p className="mt-2.5 text-xl font-semibold text-text">{formatDuration(analytics.meanDuration)}</p>
          <p className="mt-1.5 text-[11px] text-muted">Average alert age.</p>
        </div>
        <div className="rounded-xl border border-border bg-base/35 p-3.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">MTTR (proxy)</p>
          <p className="mt-2.5 text-xl font-semibold text-text">{formatDuration(analytics.medianDuration)}</p>
          <p className="mt-1.5 text-[11px] text-muted">Median alert age.</p>
        </div>
        <div className="rounded-xl border border-border bg-base/35 p-3.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Incident frequency</p>
          <p className="mt-2.5 text-xl font-semibold text-text">{analytics.frequency7d.total.toLocaleString()}</p>
          <p className="mt-1.5 text-[11px] text-muted">
            Last 7d avg {analytics.frequency7d.average.toFixed(1)}/day.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-base/35 p-3.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Busiest day</p>
          <p className="mt-2.5 text-xl font-semibold text-text">{analytics.frequency30d.busiest.count}</p>
          <p className="mt-1.5 text-[11px] text-muted">
            {analytics.frequency30d.busiest.date} in the last 30d.
          </p>
        </div>
      </div>
    </div>
  );
}
