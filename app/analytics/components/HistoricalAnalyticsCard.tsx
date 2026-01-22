import type { AnalyticsSummary } from "../../../lib/analytics";
import { formatDuration } from "../utils";

type HistoricalAnalyticsCardProps = {
  analytics: AnalyticsSummary;
};

export default function HistoricalAnalyticsCard({ analytics }: HistoricalAnalyticsCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Historical analytics</p>
          <h3 className="mt-2 text-2xl font-semibold">MTTR, MTTA, frequency</h3>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">Based on active alerts</span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-base/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">MTTA (proxy)</p>
          <p className="mt-3 text-2xl font-semibold">{formatDuration(analytics.meanDuration)}</p>
          <p className="mt-2 text-xs text-muted">Average alert age.</p>
        </div>
        <div className="rounded-2xl border border-border bg-base/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">MTTR (proxy)</p>
          <p className="mt-3 text-2xl font-semibold">{formatDuration(analytics.medianDuration)}</p>
          <p className="mt-2 text-xs text-muted">Median alert age.</p>
        </div>
        <div className="rounded-2xl border border-border bg-base/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Incident frequency</p>
          <p className="mt-3 text-2xl font-semibold">{analytics.frequency7d.total.toLocaleString()}</p>
          <p className="mt-2 text-xs text-muted">
            Last 7d avg {analytics.frequency7d.average.toFixed(1)}/day.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-base/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Busiest day</p>
          <p className="mt-3 text-2xl font-semibold">{analytics.frequency30d.busiest.count}</p>
          <p className="mt-2 text-xs text-muted">
            {analytics.frequency30d.busiest.date} in the last 30d.
          </p>
        </div>
      </div>
    </div>
  );
}
