export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0m";
  }
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

type TrendDelta = { trend: "up" | "down"; text: string };

export function formatDelta(current: number, previous: number): TrendDelta {
  if (previous === 0) {
    if (current === 0) {
      return { trend: "up" as const, text: "0.0%" };
    }
    return { trend: "up" as const, text: "+100.0%" };
  }
  const diff = ((current - previous) / previous) * 100;
  const trend: TrendDelta["trend"] = diff >= 0 ? "up" : "down";
  const text = `${diff >= 0 ? "+" : ""}${Math.abs(diff).toFixed(1)}%`;
  return { trend, text };
}
