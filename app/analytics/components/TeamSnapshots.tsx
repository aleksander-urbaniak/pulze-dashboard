import type { AnalyticsSummary } from "../../../lib/analytics";

type TeamSnapshotsProps = {
  teamStats: AnalyticsSummary["teamStats"];
};

export default function TeamSnapshots({ teamStats }: TeamSnapshotsProps) {
  return (
    <div className="mt-8 rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Team dashboards</p>
          <h3 className="mt-2 text-2xl font-semibold">Team-level snapshots</h3>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">Source-based grouping</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {teamStats.map((team) => (
          <div key={team.id} className="rounded-2xl border border-border bg-base/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">{team.name}</p>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-3xl font-semibold">{team.total}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted">Alerts</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Critical</span>
                <span className="font-semibold">{team.critical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Top label</span>
                <span className="font-semibold">{team.topLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last seen</span>
                <span className="font-semibold">
                  {team.lastSeen ? new Date(team.lastSeen).toLocaleTimeString() : "N/A"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
