import crypto from "crypto";

import type { Alert } from "./types";

function hashGroupKey(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function inferGroupService(alert: Alert) {
  return (
    alert.service?.trim() ||
    alert.instance?.trim() ||
    alert.name?.trim() ||
    "unknown"
  );
}

export function groupAndDeduplicateAlerts(alerts: Alert[]) {
  if (alerts.length === 0) {
    return [];
  }
  const groups = new Map<string, Alert[]>();
  alerts.forEach((alert) => {
    const keyBase = alert.fingerprint?.trim()
      ? `fingerprint:${alert.source}:${alert.sourceId ?? ""}:${alert.fingerprint.trim()}`
      : `service:${alert.source}:${alert.sourceId ?? ""}:${inferGroupService(alert)}:${alert.environment ?? ""}`;
    const key = hashGroupKey(keyBase);
    const existing = groups.get(key);
    if (existing) {
      existing.push(alert);
    } else {
      groups.set(key, [alert]);
    }
  });

  const result: Alert[] = [];
  groups.forEach((groupAlerts, key) => {
    const sorted = [...groupAlerts].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const latest = sorted[0];
    result.push({
      ...latest,
      groupKey: key,
      groupSize: sorted.length,
      groupedAlertIds: sorted.map((entry) => entry.id)
    });
  });

  return result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

