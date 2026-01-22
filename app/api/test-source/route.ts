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
  id?: string;
  source?: Partial<PrometheusSource | ZabbixSource | KumaSource>;
};

function requireSource<T extends { id: string }>(list: T[], id?: string) {
  if (!id) {
    return null;
  }
  return list.find((item) => item.id === id) ?? null;
}

function resolveSource<T extends { id?: string }>(
  payloadSource: Partial<T> | undefined,
  list: T[],
  id?: string
) {
  if (payloadSource) {
    return payloadSource;
  }
  return requireSource(list as Array<T & { id: string }>, id);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Partial<TestPayload>;
  if (!payload?.type) {
    return NextResponse.json({ error: "Missing source parameters" }, { status: 400 });
  }

  const settings = getSettings();

  try {
    if (payload.type === "Prometheus") {
      const source = resolveSource<PrometheusSource>(
        payload.source as Partial<PrometheusSource> | undefined,
        settings.prometheusSources,
        payload.id
      );
      if (!source || !source.url) {
        return NextResponse.json({ error: "Prometheus URL required" }, { status: 400 });
      }
      const normalized: PrometheusSource = {
        id: source.id ?? payload.id ?? "draft",
        name: source.name ?? "",
        url: source.url ?? "",
        authType: source.authType ?? "none",
        authValue: source.authValue ?? ""
      };
      const sampleLine = await fetchPrometheusTestLine(normalized);
      return NextResponse.json({
        ok: true,
        message: sampleLine ? "Sample alert fetched." : "Connected. No active alerts.",
        sampleLine
      });
    }

    if (payload.type === "Zabbix") {
      const source = resolveSource<ZabbixSource>(
        payload.source as Partial<ZabbixSource> | undefined,
        settings.zabbixSources,
        payload.id
      );
      if (!source || !source.url) {
        return NextResponse.json({ error: "Zabbix URL required" }, { status: 400 });
      }
      const normalized: ZabbixSource = {
        id: source.id ?? payload.id ?? "draft",
        name: source.name ?? "",
        url: source.url ?? "",
        token: source.token ?? ""
      };
      const sampleLine = await fetchZabbixTestLine(normalized);
      return NextResponse.json({
        ok: true,
        message: sampleLine ? "Sample alert fetched." : "Connected. No active alerts.",
        sampleLine
      });
    }

    const source = resolveSource<KumaSource>(
      payload.source as Partial<KumaSource> | undefined,
      settings.kumaSources,
      payload.id
    );
    if (!source || !source.baseUrl) {
      return NextResponse.json({ error: "Kuma base URL required" }, { status: 400 });
    }
    const normalized: KumaSource = {
      id: source.id ?? payload.id ?? "draft",
      name: source.name ?? "",
      baseUrl: source.baseUrl ?? "",
      mode: source.mode ?? "status",
      slug: source.slug ?? "",
      key: source.key ?? ""
    };
    if (normalized.mode === "status" && !normalized.slug) {
      return NextResponse.json({ error: "Status page slug required." }, { status: 400 });
    }
    const sampleLine = await fetchKumaTestLine(normalized);
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

