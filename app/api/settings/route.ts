import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getSettings, logAudit, updateSettings } from "../../../lib/db";
import { requirePermission } from "../../../lib/auth-guard";
import { hasPermission } from "../../../lib/rbac";
import type {
  AppearanceSettings,
  BrandingSettings,
  BackgroundSettings,
  KumaSource,
  PrometheusSource,
  ThemePalette,
  ZabbixSource
} from "../../../lib/types";
import { defaultAppearance } from "../../../lib/appearance";

export const runtime = "nodejs";

export async function GET() {
  const permission = await requirePermission("settings.read");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const settings = getSettings();
  const canEdit = hasPermission(user, "settings.write");

  return NextResponse.json({
    settings: {
      ...settings,
      prometheusSources: settings.prometheusSources.map((source) => ({
        ...source,
        authValue: canEdit ? source.authValue : ""
      })),
      zabbixSources: settings.zabbixSources.map((source) => ({
        ...source,
        token: canEdit ? source.token : ""
      })),
      kumaSources: settings.kumaSources.map((source) => ({
        ...source,
        key: canEdit ? source.key : ""
      }))
    },
    canEdit
  });
}

export async function PUT(request: Request) {
  const permission = await requirePermission("settings.write");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const payload = (await request.json()) as Partial<{
    prometheusSources: PrometheusSource[];
    zabbixSources: ZabbixSource[];
    kumaSources: KumaSource[];
    refreshInterval: number;
    appearance: AppearanceSettings;
  }>;

  function normalizeHex(value: unknown, fallback: string) {
    if (typeof value !== "string") {
      return fallback;
    }
    const trimmed = value.trim();
    const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return `#${hex.toUpperCase()}`;
    }
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      const expanded = hex
        .split("")
        .map((char) => char + char)
        .join("");
      return `#${expanded.toUpperCase()}`;
    }
    return fallback;
  }

  function normalizePalette(input: ThemePalette, fallback: ThemePalette): ThemePalette {
    return {
      base: normalizeHex(input.base, fallback.base),
      surface: normalizeHex(input.surface, fallback.surface),
      text: normalizeHex(input.text, fallback.text),
      muted: normalizeHex(input.muted, fallback.muted),
      accent: normalizeHex(input.accent, fallback.accent),
      accentSoft: normalizeHex(input.accentSoft, fallback.accentSoft),
      border: normalizeHex(input.border, fallback.border)
    };
  }

  function normalizeBranding(input: BrandingSettings, fallback: BrandingSettings): BrandingSettings {
    return {
      logoUrl: typeof input.logoUrl === "string" ? input.logoUrl.trim() : fallback.logoUrl,
      faviconUrl: typeof input.faviconUrl === "string" ? input.faviconUrl.trim() : fallback.faviconUrl
    };
  }

  function normalizeBackground(
    input: BackgroundSettings,
    fallback: BackgroundSettings
  ): BackgroundSettings {
    const clamp = (value: unknown, fallbackValue: number) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallbackValue;
      }
      return Math.max(0, Math.min(100, value));
    };
    return {
      gradient: clamp(input.gradient, fallback.gradient),
      glow: clamp(input.glow, fallback.glow),
      noise: clamp(input.noise, fallback.noise)
    };
  }

  const current = getSettings();
  const prometheusSources = (Array.isArray(payload.prometheusSources)
    ? payload.prometheusSources
    : current.prometheusSources
  ).map((source) => {
    const authType: PrometheusSource["authType"] =
      source.authType === "basic" || source.authType === "bearer" ? source.authType : "none";
    return {
      id: source.id ?? crypto.randomUUID(),
      name: source.name?.trim() ?? "",
      url: source.url?.trim() ?? "",
      authType,
      authValue: source.authValue?.trim() ?? ""
    };
  });

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
  ).map((source) => {
    const mode: KumaSource["mode"] = source.mode === "apiKey" ? "apiKey" : "status";
    return {
      id: source.id ?? crypto.randomUUID(),
      name: source.name?.trim() ?? "",
      baseUrl: source.baseUrl?.trim() ?? "",
      mode,
      slug: source.slug?.trim() ?? "",
      key: source.key?.trim() ?? ""
    };
  });

  const refreshIntervalValue =
    payload.refreshInterval === undefined ? current.refreshInterval : payload.refreshInterval;
  const refreshInterval = Number(refreshIntervalValue);
  const safeRefreshInterval = Number.isFinite(refreshInterval)
    ? Math.max(5, refreshInterval)
    : 30;
  const appearancePayload = payload.appearance ?? current.appearance ?? defaultAppearance;
  const appearance: AppearanceSettings = {
    light: normalizePalette(appearancePayload.light, defaultAppearance.light),
    dark: normalizePalette(appearancePayload.dark, defaultAppearance.dark),
    branding: normalizeBranding(
      appearancePayload.branding ?? defaultAppearance.branding,
      defaultAppearance.branding
    ),
    background: normalizeBackground(
      appearancePayload.background ?? defaultAppearance.background,
      defaultAppearance.background
    )
  };
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
    refreshInterval: safeRefreshInterval,
    appearance
  });

  logAudit("settings.update", user.id, {
    prometheusCount: normalizedPrometheus.length,
    zabbixCount: normalizedZabbix.length,
    kumaCount: normalizedKuma.length,
    refreshInterval: safeRefreshInterval
  });

  return NextResponse.json({ settings: next, canEdit: true });
}

