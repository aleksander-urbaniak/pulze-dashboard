import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import type { User } from "../../../lib/types";
import UserGreetingPill from "../../../components/UserGreetingPill";

type AnalyticsHeaderProps = {
  user: User;
  isLoadingAlerts: boolean;
  onRefresh: () => void;
};

export default function AnalyticsHeader({ user, isLoadingAlerts, onRefresh }: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faChartLine} className="h-5 w-5 shrink-0 text-accent" />
        <h2 className="text-[2.2rem] font-semibold leading-none text-text">Traffic insights</h2>
      </div>
      <div className="flex items-center gap-3">
        <UserGreetingPill user={user} />
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-border bg-surface/85 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-text"
        >
          {isLoadingAlerts ? "Refreshing" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
