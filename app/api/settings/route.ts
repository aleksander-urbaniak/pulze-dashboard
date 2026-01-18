import crypto from "crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { getSettings, updateSettings } from "../../../lib/db";
import type { KumaSource, PrometheusSource, ZabbixSource } from "../../../lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = getSettings();
  const isAdmin = user.role === "admin";

  return NextResponse.json({
    settings: {
      ...settings,
      prometheusSources: settings.prometheusSources.map((source) => ({
        ...source,
        authValue: isAdmin ? source.authValue : ""
      })),
      zabbixSources: settings.zabbixSources.map((source) => ({
        ...source,
        token: isAdmin ? source.token : ""
      })),
      kumaSources: settings.kumaSources.map((source) => ({
        ...source,
        key: isAdmin ? source.key : ""
      }))
    },
    canEdit: isAdmin
  });
}

export async function PUT(request: Request) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Partial<{
    prometheusSources: PrometheusSource[];
    zabbixSources: ZabbixSource[];
    kumaSources: KumaSource[];
    refreshInterval: number;
  }>;

  const current = getSettings();
  const prometheusSources = (Array.isArray(payload.prometheusSources)
    ? payload.prometheusSources
    : current.prometheusSources
  ).map((source) => ({
    id: source.id ?? crypto.randomUUID(),
    name: source.name?.trim() ?? "",
    url: source.url?.trim() ?? "",
    authType: source.authType === "basic" || source.authType === "bearer" ? source.authType : "none",
    authValue: source.authValue?.trim() ?? ""
  }));

  const zabbixSources = (Array.isArray(payload.zabbixSources)
    ? payload.zabbixSources
    : current.zabbixSources
  ).map((source) => ({
    id: source.id ?? crypto.randomUUID(),
    name: source.name?.trim() ?? "",
    url: source.url?.trim() ?? "",
    token: source.token?.trim() ?? ""
  }));

  const kumaSources = (Array.isArray(payload.kumaSources)
    ? payload.kumaSources
    : current.kumaSources
  ).map((source) => ({
    id: source.id ?? crypto.randomUUID(),
    name: source.name?.trim() ?? "",
    baseUrl: source.baseUrl?.trim() ?? "",
    mode: source.mode === "apiKey" ? "apiKey" : "status",
    slug: source.slug?.trim() ?? "",
    key: source.key?.trim() ?? ""
  }));

  const refreshIntervalValue =
    payload.refreshInterval === undefined ? current.refreshInterval : payload.refreshInterval;
  const refreshInterval = Number(refreshIntervalValue);
  const safeRefreshInterval = Number.isFinite(refreshInterval)
    ? Math.max(5, refreshInterval)
    : 30;
  const normalizedPrometheus = prometheusSources.filter((source) => source.url);
  const normalizedZabbix = zabbixSources.filter((source) => source.url);
  const normalizedKuma = kumaSources.filter((source) => source.baseUrl);

  if (
    normalizedPrometheus.some((source) => !source.name) ||
    normalizedZabbix.some((source) => !source.name) ||
    normalizedKuma.some((source) => !source.name)
  ) {
    return NextResponse.json(
      { error: "Every monitoring source must include a label." },
      { status: 400 }
    );
  }

  const next = updateSettings({
    prometheusSources: normalizedPrometheus,
    zabbixSources: normalizedZabbix,
    kumaSources: normalizedKuma,
    refreshInterval: safeRefreshInterval
  });

  return NextResponse.json({ settings: next, canEdit: true });
}
