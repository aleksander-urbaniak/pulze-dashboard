import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { fetchKumaAlerts, fetchPrometheusAlerts, fetchZabbixAlerts } from "../../../../lib/alerts";
import { buildAnalyticsSummary } from "../../../../lib/analytics";
import { getSettings } from "../../../../lib/db";

export const runtime = "nodejs";

const CACHE_TTL_MS = 30 * 1000;

type SummaryCache = {
  data: ReturnType<typeof buildAnalyticsSummary>;
  generatedAt: string;
  expiresAt: number;
};

const globalCache = globalThis as { analyticsSummaryCache?: SummaryCache };

export async function GET() {
  const cached = globalCache.analyticsSummaryCache;
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { summary: cached.data, generatedAt: cached.generatedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const settings = getSettings();
  const results = await Promise.allSettled([
    fetchPrometheusAlerts(settings),
    fetchZabbixAlerts(settings),
    fetchKumaAlerts(settings)
  ]);

  const alerts = [] as Array<any>;
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      alerts.push(...result.value.alerts);
    }
  });

  const summary = buildAnalyticsSummary(alerts);
  globalCache.analyticsSummaryCache = {
    data: summary,
    generatedAt: new Date().toISOString(),
    expiresAt: Date.now() + CACHE_TTL_MS
  };

  return NextResponse.json(
    { summary, generatedAt: globalCache.analyticsSummaryCache.generatedAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}


