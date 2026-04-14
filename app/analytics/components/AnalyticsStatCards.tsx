import type { ReactNode } from "react";

type StatCard = {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  color: string;
  bg: string;
  icon: ReactNode;
};

type AnalyticsStatCardsProps = {
  statCards: StatCard[];
};

export default function AnalyticsStatCards({ statCards }: AnalyticsStatCardsProps) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div
          key={card.id}
          className="rounded-xl border border-border bg-surface/92 p-4 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-base/35 ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div
              className={
                card.trend === "up"
                  ? "flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-500/12 px-2 py-1 text-xs font-semibold text-emerald-300"
                  : "flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/12 px-2 py-1 text-xs font-semibold text-rose-300"
              }
            >
              {card.trend === "up" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 14l5-5 5 5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {card.change}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{card.title}</p>
          <p className="mt-1 text-xl font-semibold text-text">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
