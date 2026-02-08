import { NextResponse } from "next/server";

import { fetchKumaAlerts, fetchPrometheusAlerts, fetchZabbixAlerts } from "../../../lib/alerts";
import { groupAndDeduplicateAlerts } from "../../../lib/alert-processing";
import { requirePermission } from "../../../lib/auth-guard";
import {
  getAlertStatesByIds,
  getSettings,
  listSourceHealth,
  resolveMissingAlertStates,
  upsertAlertLogEntries
} from "../../../lib/db";

export const runtime = "nodejs";

function aggregateGroupedState(alertIds: string[], stateMap: Map<string, any>) {
  const states = alertIds
    .map((id) => stateMap.get(id))
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (states.length === 0) {
    return {
      ackStatus: "active" as const
    };
  }
  const hasActive = states.some((state) => state.status === "active");
  const hasAcknowledged = states.some((state) => state.status === "acknowledged");
  const chosen = states[0];
  return {
    ackStatus: hasActive ? "active" : hasAcknowledged ? "acknowledged" : "resolved",
    ackNote: chosen.note,
    ackUpdatedAt: chosen.updatedAt,
    ackUpdatedBy: chosen.updatedBy ?? undefined,
    acknowledgedAt: chosen.acknowledgedAt ?? undefined,
    resolvedAt: chosen.resolvedAt ?? undefined
  };
}

export async function GET(request: Request) {
  const permission = await requirePermission("dashboard.read");
  if (permission.response) {
    return permission.response;
  }
  const url = new URL(request.url);
  const grouped = url.searchParams.get("grouped") !== "0";
  const settings = getSettings();
  const staleThresholdMs = Math.max(5 * 60 * 1000, settings.refreshInterval * 1000 * 3);
  const results = await Promise.allSettled([
    fetchPrometheusAlerts(settings),
    fetchZabbixAlerts(settings),
    fetchKumaAlerts(settings)
  ]);

  const alerts = [] as Array<any>;
  const errors: Array<{ source: string; message: string }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      alerts.push(...result.value.alerts);
      errors.push(...result.value.errors);
    } else {
      const source = index === 0 ? "Prometheus" : index === 1 ? "Zabbix" : "Kuma";
      errors.push({ source, message: result.reason?.message ?? "Request failed" });
    }
  });

  upsertAlertLogEntries(alerts);

  const alertIds = alerts.map((alert) => alert.id);
  const stateMap = getAlertStatesByIds(alertIds);
  resolveMissingAlertStates(alertIds);

  const mergedAlerts = alerts.map((alert) => {
    const state = stateMap.get(alert.id);
    if (state) {
      return {
        ...alert,
        ackStatus: state.status,
        ackNote: state.note,
        ackUpdatedAt: state.updatedAt,
        ackUpdatedBy: state.updatedBy ?? undefined,
        acknowledgedAt: state.acknowledgedAt ?? undefined,
        resolvedAt: state.resolvedAt ?? undefined
      };
    }
    return {
      ...alert,
      ackStatus: "active"
    };
  });

  mergedAlerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const processedAlerts = grouped ? groupAndDeduplicateAlerts(mergedAlerts) : mergedAlerts;
  const responseAlerts = processedAlerts.map((alert) => {
    const ids = alert.groupedAlertIds?.length ? alert.groupedAlertIds : [alert.id];
    return {
      ...alert,
      ...aggregateGroupedState(ids, stateMap)
    };
  });

  const healthRows = listSourceHealth();
  const healthMap = new Map(
    healthRows.map((row) => [`${row.sourceType}:${row.sourceId}`, row])
  );
  const sources = [
    ...settings.prometheusSources
      .filter((source) => source.url)
      .map((source) => ({
        sourceId: source.id,
        sourceType: "Prometheus",
        sourceLabel: source.name,
        ...healthMap.get(`Prometheus:${source.id}`)
      })),
    ...settings.zabbixSources
      .filter((source) => source.url)
      .map((source) => ({
        sourceId: source.id,
        sourceType: "Zabbix",
        sourceLabel: source.name,
        ...healthMap.get(`Zabbix:${source.id}`)
      })),
    ...settings.kumaSources
      .filter((source) => source.baseUrl)
      .map((source) => ({
        sourceId: source.id,
        sourceType: "Kuma",
        sourceLabel: source.name,
        ...healthMap.get(`Kuma:${source.id}`)
      }))
  ].map((entry) => ({
    sourceId: entry.sourceId,
    sourceType: entry.sourceType as "Prometheus" | "Zabbix" | "Kuma",
    sourceLabel: entry.sourceLabel,
    lastSuccessAt: entry?.lastSuccessAt ?? null,
    lastErrorAt: entry?.lastErrorAt ?? null,
    lastErrorMessage: entry?.lastErrorMessage ?? null,
    failCount: entry?.failCount ?? 0,
    nextRetryAt: entry?.nextRetryAt ?? null
  }));

  const staleSources = sources.filter((source) => {
    if (!source.lastSuccessAt) {
      return source.failCount > 0;
    }
    const lastSuccess = new Date(source.lastSuccessAt).getTime();
    if (Number.isNaN(lastSuccess)) {
      return source.failCount > 0;
    }
    return Date.now() - lastSuccess > staleThresholdMs;
  });

  return NextResponse.json(
    {
      alerts: responseAlerts,
      errors,
      health: {
        staleThresholdMs,
        sources,
        staleSources
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

