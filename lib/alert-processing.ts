import crypto from "crypto";

import type { Alert, SilenceRule } from "./types";

function toRegex(pattern: string) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function matchesPattern(value: string | undefined, pattern: string | undefined) {
  const trimmedPattern = pattern?.trim();
  if (!trimmedPattern) {
    return true;
  }
  const input = (value ?? "").trim();
  if (!input) {
    return false;
  }
  return toRegex(trimmedPattern).test(input);
}

function hashGroupKey(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

export function applyAlertSilences(alerts: Alert[], silences: SilenceRule[]) {
  if (alerts.length === 0 || silences.length === 0) {
    return alerts;
  }
  const now = Date.now();
  const activeSilences = silences.filter((silence) => {
    if (!silence.enabled) {
      return false;
    }
    const start = new Date(silence.startsAt).getTime();
    const end = new Date(silence.endsAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return false;
    }
    return start <= now && end >= now;
  });
  if (activeSilences.length === 0) {
    return alerts;
  }
  return alerts.filter((alert) => {
    for (const silence of activeSilences) {
      if (silence.sourceType !== "Any" && silence.sourceType !== alert.source) {
        continue;
      }
      if (silence.sourceId && silence.sourceId !== alert.sourceId) {
        continue;
      }
      if (silence.sourceLabel && silence.sourceLabel.trim()) {
        if ((alert.sourceLabel ?? "").trim().toLowerCase() !== silence.sourceLabel.trim().toLowerCase()) {
          continue;
        }
      }
      if (silence.severity && silence.severity !== "Any" && silence.severity !== alert.severity) {
        continue;
      }
      if (!matchesPattern(alert.service, silence.servicePattern)) {
        continue;
      }
      if (!matchesPattern(alert.environment, silence.environmentPattern)) {
        continue;
      }
      if (!matchesPattern(alert.name, silence.alertNamePattern)) {
        continue;
      }
      if (!matchesPattern(alert.instance, silence.instancePattern)) {
        continue;
      }
      return false;
    }
    return true;
  });
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

