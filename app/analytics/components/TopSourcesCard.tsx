import type { AnalyticsSummary } from "../../../lib/analytics";

type TopSourcesCardProps = {
  sources: AnalyticsSummary["topSources"];
};

export default function TopSourcesCard({ sources }: TopSourcesCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface/92 p-4 shadow-card sm:p-5">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Monitoring Instances</p>
      <h3 className="mt-1.5 text-xl font-semibold text-text">Most active instances</h3>
      <div className="mt-5 space-y-2.5">
        {sources.length === 0 ? (
          <p className="text-sm text-muted">No monitoring labels captured yet.</p>
        ) : (
          sources.map((source, index) => (
            <div
              key={`${source.name}-${index}`}
              className="flex items-center justify-between rounded-xl border border-border bg-base/35 px-4 py-2.5"
            >
              <span className="text-sm font-semibold text-text">{source.name}</span>
              <span className="text-xs text-muted">{source.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
