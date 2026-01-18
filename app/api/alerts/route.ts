import { NextResponse } from "next/server";

import { fetchKumaAlerts, fetchPrometheusAlerts, fetchZabbixAlerts } from "../../../lib/alerts";
import { getSettings } from "../../../lib/db";

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

  alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return NextResponse.json({ alerts, errors }, { headers: { "Cache-Control": "no-store" } });
}
