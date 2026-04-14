import type { AnalyticsSummary } from "../../../lib/analytics";

type NoisyAlertsCardProps = {
  alerts: AnalyticsSummary["topNoisyAlerts"];
};

export default function NoisyAlertsCard({ alerts }: NoisyAlertsCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface/92 p-4 shadow-card sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Top noisy sources</p>
      <h3 className="mt-1.5 text-xl font-semibold text-text">Noisiest alert names</h3>
      <div className="mt-5 space-y-2.5">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alert noise recorded yet.</p>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={`${alert.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-border bg-base/35 px-4 py-2.5"
            >
              <span className="text-sm font-semibold text-text">{alert.name}</span>
              <span className="text-xs text-muted">{alert.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
