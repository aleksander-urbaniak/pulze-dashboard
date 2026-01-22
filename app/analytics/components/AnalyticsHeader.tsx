type AnalyticsHeaderProps = {
  isLoadingAlerts: boolean;
  onRefresh: () => void;
};

export default function AnalyticsHeader({ isLoadingAlerts, onRefresh }: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <div className="flex flex-col items-center sm:items-start">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Analytics</p>
        <h2 className="mt-2 text-3xl font-semibold">Traffic insights</h2>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
      >
        {isLoadingAlerts ? "Refreshing" : "Refresh"}
      </button>
    </div>
  );
}
