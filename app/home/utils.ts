import type { Alert } from "../../lib/types";

export function readCookieValue(name: string) {
  if (typeof document === "undefined") {
    return null;
  }
  const entry = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!entry) {
    return null;
  }
  return decodeURIComponent(entry.split("=").slice(1).join("="));
}

export function writeCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

export function formatRelativeTime(value: string | null | undefined) {
  if (!value) {
    return "never";
  }
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return "unknown";
  }
  const diffMs = Date.now() - parsed;
  const isFuture = diffMs < 0;
  const diffMinutes = Math.round(Math.abs(diffMs) / 60000);
  if (diffMinutes < 1) {
    return isFuture ? "soon" : "just now";
  }
  const minutes = diffMinutes;
  if (minutes < 60) {
    return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return isFuture ? `in ${hours}h` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return isFuture ? `in ${days}d` : `${days}d ago`;
}

export function exportAlertsToCsv(targetAlerts: Alert[]) {
  if (targetAlerts.length === 0) {
    return;
  }
  const headers = [
    "id",
    "name",
    "severity",
    "source",
    "sourceLabel",
    "instance",
    "message",
    "timestamp",
    "status",
    "note"
  ];
  const escapeValue = (value: string) => `"${value.replace(/\"/g, "\"\"")}"`;
  const rows = targetAlerts.map((alert) => [
    alert.id,
    alert.name,
    alert.severity,
    alert.source,
    alert.sourceLabel ?? "",
    alert.instance ?? "",
    alert.message,
    alert.timestamp,
    alert.ackStatus ?? "active",
    alert.ackNote ?? ""
  ]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((value) => escapeValue(String(value))).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "alerts.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
