import { NextResponse } from "next/server";

import { fetchKumaAlerts, fetchPrometheusAlerts, fetchZabbixAlerts } from "../../../lib/alerts";
import {
  getAlertStatesByIds,
  getSettings,
  listSourceHealth,
  resolveMissingAlertStates,
  upsertAlertLogEntries
} from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
      alerts: mergedAlerts,
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

