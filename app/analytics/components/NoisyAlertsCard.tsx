import type { AnalyticsSummary } from "../../../lib/analytics";

type NoisyAlertsCardProps = {
  alerts: AnalyticsSummary["topNoisyAlerts"];
};

export default function NoisyAlertsCard({ alerts }: NoisyAlertsCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Top noisy sources</p>
      <h3 className="mt-2 text-2xl font-semibold">Noisiest alert names</h3>
      <div className="mt-6 space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alert noise recorded yet.</p>
        ) : (
          alerts.map((alert, index) => (
            <div
              key={`${alert.name}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-base/50 px-4 py-3"
            >
              <span className="text-sm font-semibold">{alert.name}</span>
              <span className="text-xs text-muted">{alert.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
