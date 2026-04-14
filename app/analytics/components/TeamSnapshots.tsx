import type { AnalyticsSummary } from "../../../lib/analytics";

type TeamSnapshotsProps = {
  teamStats: AnalyticsSummary["teamStats"];
};

export default function TeamSnapshots({ teamStats }: TeamSnapshotsProps) {
  return (
    <div className="mt-7 rounded-2xl border border-border bg-surface/92 p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">Team dashboards</p>
          <h3 className="mt-1.5 text-xl font-semibold text-text">Team-level snapshots</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Source-based grouping</span>
      </div>
      <div className="mt-5 grid gap-3.5 md:grid-cols-3">
        {teamStats.map((team) => (
          <div key={team.id} className="rounded-xl border border-border bg-base/35 p-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{team.name}</p>
            <div className="mt-3.5 flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-text">{team.total}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted">Alerts</span>
            </div>
            <div className="mt-3.5 space-y-2 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Critical</span>
                <span className="font-semibold text-text">{team.critical}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Top label</span>
                <span className="font-semibold text-text">{team.topLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last seen</span>
                <span className="font-semibold text-text">
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
