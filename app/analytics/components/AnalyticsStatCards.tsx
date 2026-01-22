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
    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div
          key={card.id}
          className="rounded-2xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <div
              className={
                card.trend === "up"
                  ? "flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600"
                  : "flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
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
          <p className="mt-4 text-sm text-muted">{card.title}</p>
          <p className="mt-1 text-2xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
