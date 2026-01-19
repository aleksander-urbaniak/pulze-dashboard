import { NextResponse } from "next/server";

import { fetchKumaAlerts, fetchPrometheusAlerts, fetchZabbixAlerts } from "../../../lib/alerts";
import { getAlertStatesByIds, getSettings, resolveMissingAlertStates } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const settings = getSettings();
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

  return NextResponse.json(
    { alerts: mergedAlerts, errors },
    { headers: { "Cache-Control": "no-store" } }
  );
}
