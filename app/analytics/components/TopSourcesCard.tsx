import type { AnalyticsSummary } from "../../../lib/analytics";

type TopSourcesCardProps = {
  sources: AnalyticsSummary["topSources"];
};

export default function TopSourcesCard({ sources }: TopSourcesCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Monitoring Instances</p>
      <h3 className="mt-2 text-2xl font-semibold">Most active instances</h3>
      <div className="mt-6 space-y-3">
        {sources.length === 0 ? (
          <p className="text-sm text-muted">No monitoring labels captured yet.</p>
        ) : (
          sources.map((source, index) => (
            <div
              key={`${source.name}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-base/50 px-4 py-3"
            >
              <span className="text-sm font-semibold">{source.name}</span>
              <span className="text-xs text-muted">{source.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
