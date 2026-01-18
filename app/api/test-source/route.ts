import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { getSettings } from "../../../lib/db";
import {
  fetchKumaTestLine,
  fetchPrometheusTestLine,
  fetchZabbixTestLine
} from "../../../lib/alerts";
import type { KumaSource, PrometheusSource, ZabbixSource } from "../../../lib/types";

export const runtime = "nodejs";

type TestPayload = {
  type: "Prometheus" | "Zabbix" | "Kuma";
  id: string;
};

function requireSource<T extends { id: string }>(list: T[], id: string) {
  return list.find((item) => item.id === id) ?? null;
}

export async function POST(request: Request) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Partial<TestPayload>;
  if (!payload?.type || !payload?.id) {
    return NextResponse.json({ error: "Missing source parameters" }, { status: 400 });
  }

  const settings = getSettings();

  try {
    if (payload.type === "Prometheus") {
      const source = requireSource(settings.prometheusSources, payload.id);
      if (!source || !source.url) {
        return NextResponse.json({ error: "Prometheus source not found" }, { status: 404 });
      }
      const sampleLine = await fetchPrometheusTestLine(source as PrometheusSource);
      return NextResponse.json({
        ok: true,
        message: sampleLine ? "Sample alert fetched." : "Connected. No active alerts.",
        sampleLine
      });
    }

    if (payload.type === "Zabbix") {
      const source = requireSource(settings.zabbixSources, payload.id);
      if (!source || !source.url) {
        return NextResponse.json({ error: "Zabbix source not found" }, { status: 404 });
      }
      const sampleLine = await fetchZabbixTestLine(source as ZabbixSource);
      return NextResponse.json({
        ok: true,
        message: sampleLine ? "Sample alert fetched." : "Connected. No active alerts.",
        sampleLine
      });
    }

    const source = requireSource(settings.kumaSources, payload.id) as KumaSource | null;
    if (!source || !source.baseUrl) {
      return NextResponse.json({ error: "Kuma source not found" }, { status: 404 });
    }
    if (source.mode === "status" && !source.slug) {
      return NextResponse.json({ error: "Status page slug required." }, { status: 400 });
    }
    const sampleLine = await fetchKumaTestLine(source);
    return NextResponse.json({
      ok: true,
      message: sampleLine ? "Sample alert fetched." : "Connected. No active alerts.",
      sampleLine
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 400 }
    );
  }
}
