import crypto from "crypto";

import type {
  Alert,
  AlertSeverity,
  AlertSource,
  KumaSource,
  PrometheusSource,
  ZabbixSource
} from "./types";
import { getSourceHealth, recordSourceFailure, recordSourceSuccess } from "./db";
import type { SettingsRow } from "./db";

export type AlertFetchError = { source: string; message: string };

export type AlertFetchResult = { alerts: Alert[]; errors: AlertFetchError[] };

function normalizeSeverity(input: string | undefined): AlertSeverity {
  const value = (input ?? "").toLowerCase();
  if (
    value.includes("crit") ||
    value.includes("high") ||
    value.includes("disaster") ||
    value === "5" ||
    value === "4"
  ) {
    return "critical";
  }
  if (value.includes("warn") || value.includes("average") || value === "3" || value === "2") {
    return "warning";
  }
  return "info";
}

function formatId(parts: Array<string | number | undefined | null>) {
  const hash = crypto.createHash("sha1");
  hash.update(parts.filter(Boolean).join("|"));
  return hash.digest("hex");
}

function appendPath(baseUrl: string, pathSuffix: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith(pathSuffix)) {
    return trimmed;
  }
  return `${trimmed}${pathSuffix}`;
}

function buildAuthHeader(type: "none" | "basic" | "bearer", value: string | undefined) {
  if (!value) {
    return {} as Record<string, string>;
  }
  if (type === "basic") {
    const encoded = Buffer.from(value).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
  if (type === "bearer") {
    return { Authorization: `Bearer ${value}` };
  }
  return {} as Record<string, string>;
}

function getBackoffUntil(
  sourceType: "Prometheus" | "Zabbix" | "Kuma",
  sourceId: string
) {
  const health = getSourceHealth(sourceType, sourceId);
  if (!health?.nextRetryAt) {
    return null;
  }
  const nextRetryAt = new Date(health.nextRetryAt).getTime();
  if (Number.isNaN(nextRetryAt) || nextRetryAt <= Date.now()) {
    return null;
  }
  return health.nextRetryAt;
}

function isDownStatus(status: unknown) {
  if (typeof status === "boolean") {
    return status === false;
  }
  if (typeof status === "number") {
    return status === 0;
  }
  if (typeof status === "string") {
    return status.toLowerCase() === "down" || status === "0" || status === "false";
  }
  return false;
}

function withSourceName(message: string, sourceName: string) {
  return sourceName ? `${message} (${sourceName})` : message;
}

function sourceLabel(service: string, sourceName: string) {
  return sourceName ? `${service} (${sourceName})` : service;
}

function buildKumaAuthAttempts(
  key: string | undefined,
  mode: KumaSource["mode"]
): Array<Record<string, string>> {
  const attempts: Array<Record<string, string>> = [];
  if (key) {
    const basic = { Authorization: `Basic ${Buffer.from(`:${key}`).toString("base64")}` };
    const bearer = { Authorization: `Bearer ${key}` };
    if (mode === "apiKey") {
      attempts.push(bearer, basic);
    } else {
      attempts.push(basic, bearer);
    }
  }
  attempts.push({});
  return attempts;
}

async function fetchKumaJson(url: string, source: KumaSource) {
  const attempts = buildKumaAuthAttempts(source.key, source.mode);
  let lastError: Error | null = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const response = await fetch(url, {
      headers: { Accept: "application/json", ...attempts[index] },
      cache: "no-store"
    });
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && index < attempts.length - 1) {
        lastError = new Error(`Unauthorized (${response.status})`);
        continue;
      }
      throw new Error(`Request failed with ${response.status}`);
    }
    try {
      return await parseJsonResponse(response);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed");
      if (index < attempts.length - 1) {
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Request failed");
}

function normalizeKumaStatusSource(source: KumaSource) {
  const trimmed = source.baseUrl.replace(/\/+$/, "");
  const match = trimmed.match(/^(https?:\/\/.+?)(?:\/status-page|\/status)\/([^/]+)$/);
  if (match) {
    return {
      baseUrl: match[1],
      slug: source.slug?.trim() || match[2]
    };
  }
  return { baseUrl: trimmed, slug: source.slug?.trim() ?? "" };
}

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    const trimmed = text.trim().toLowerCase();
    if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
      throw new Error("Received HTML response. Check the URL and authentication.");
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Unexpected response format. Check the URL and authentication.");
  }
}

function toAlert(params: {
  source: AlertSource;
  sourceLabel?: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  instance?: string;
  idParts?: Array<string | number | undefined | null>;
}): Alert {
  return {
    id: formatId(params.idParts ?? [params.source, params.name, params.timestamp]),
    source: params.source,
    sourceLabel: params.sourceLabel,
    name: params.name,
    severity: params.severity,
    message: params.message,
    timestamp: params.timestamp,
    instance: params.instance
  };
}

async function fetchPrometheusFromSource(source: PrometheusSource): Promise<Alert[]> {
  const url = appendPath(source.url, "/api/v2/alerts");
  const headers = {
    ...buildAuthHeader(source.authType, source.authValue)
  };
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const data = (await parseJsonResponse(response)) as any[];
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((alert) => alert?.status?.state === "active")
    .map((alert) => {
      const labels = alert.labels ?? {};
      const annotations = alert.annotations ?? {};
      const name = labels.alertname ?? "Alert";
      const instance = labels.instance ?? "";
      const instanceLabel = labels.instance ?? "-";
      const message = withSourceName(
        annotations.summary ?? annotations.description ?? instanceLabel,
        source.name
      );
      const severity = normalizeSeverity(labels.severity);
      const timestamp = alert.startsAt ?? new Date().toISOString();
      return toAlert({
        source: "Prometheus",
        sourceLabel: source.name,
        name,
        severity,
        message,
        timestamp,
        instance,
        idParts: [source.id, alert.fingerprint, name, instanceLabel, timestamp]
      });
    });
}

export async function fetchPrometheusSourceAlerts(source: PrometheusSource): Promise<Alert[]> {
  return fetchPrometheusFromSource(source);
}

export async function fetchPrometheusTestLine(source: PrometheusSource): Promise<string | null> {
  const url = appendPath(source.url, "/api/v2/alerts");
  const headers = {
    ...buildAuthHeader(source.authType, source.authValue)
  };
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const data = (await parseJsonResponse(response)) as any[];
  if (!Array.isArray(data)) {
    return null;
  }
  const active = data.find((alert) => alert?.status?.state === "active");
  if (!active) {
    return null;
  }
  const labels = active.labels ?? {};
  const startsAt = active.startsAt ?? "";
  const alertName = labels.alertname ?? "-";
  const instance = labels.instance ?? "-";
  return `${startsAt}\t${alertName}\t${instance}`;
}

export async function fetchPrometheusAlerts(settings: SettingsRow): Promise<AlertFetchResult> {
  const alerts: Alert[] = [];
  const errors: AlertFetchError[] = [];

  for (const source of settings.prometheusSources) {
    if (!source.url) {
      continue;
    }
    const backoffUntil = getBackoffUntil("Prometheus", source.id);
    if (backoffUntil) {
      errors.push({
        source: sourceLabel("Prometheus", source.name),
        message: `Backoff active until ${backoffUntil}`
      });
      continue;
    }
    try {
      alerts.push(...(await fetchPrometheusFromSource(source)));
      recordSourceSuccess("Prometheus", source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      recordSourceFailure("Prometheus", source.id, message);
      errors.push({
        source: sourceLabel("Prometheus", source.name),
        message
      });
    }
  }

  return { alerts, errors };
}

async function fetchZabbixFromSource(source: ZabbixSource): Promise<Alert[]> {
  const url = appendPath(source.url, "/zabbix/api_jsonrpc.php");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      ...(source.token ? { Authorization: `Bearer ${source.token}` } : {})
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        output: ["description", "priority", "lastchange", "triggerid"],
        selectHosts: ["host"],
        filter: { value: 1 }
      },
      id: 1
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const data = (await parseJsonResponse(response)) as any;
  const result = Array.isArray(data?.result) ? data.result : [];
  return result.map((trigger: any) => {
    const host = trigger?.hosts?.[0]?.host ?? "unknown";
    const name = trigger?.description ?? "Trigger";
    const severity = normalizeSeverity(String(trigger?.priority ?? ""));
    const timestamp = trigger?.lastchange
      ? new Date(Number(trigger.lastchange) * 1000).toISOString()
      : new Date().toISOString();
    return toAlert({
      source: "Zabbix",
      sourceLabel: source.name,
      name,
      severity,
      message: withSourceName(`${host} - ${name}`, source.name),
      timestamp,
      instance: host,
      idParts: [source.id, trigger?.triggerid, host, name, timestamp]
    });
  });
}

export async function fetchZabbixSourceAlerts(source: ZabbixSource): Promise<Alert[]> {
  return fetchZabbixFromSource(source);
}

function zabbixPriorityLabel(input: unknown) {
  const value = String(input ?? "");
  const mapping: Record<string, string> = {
    "0": "Not classified",
    "1": "Information",
    "2": "Warning",
    "3": "Average",
    "4": "High",
    "5": "Disaster"
  };
  return mapping[value] ?? value;
}

export async function fetchZabbixTestLine(source: ZabbixSource): Promise<string | null> {
  const url = appendPath(source.url, "/zabbix/api_jsonrpc.php");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      ...(source.token ? { Authorization: `Bearer ${source.token}` } : {})
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        output: ["description", "priority"],
        selectHosts: ["host"],
        filter: { value: 1 }
      },
      id: 1
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const data = (await parseJsonResponse(response)) as any;
  const result = Array.isArray(data?.result) ? data.result : [];
  const trigger = result[0];
  if (!trigger) {
    return null;
  }
  const host = trigger?.hosts?.[0]?.host ?? "unknown";
  const description = trigger?.description ?? "-";
  const priority = zabbixPriorityLabel(trigger?.priority);
  return `${host}\t${description}\t${priority}`;
}

export async function fetchZabbixAlerts(settings: SettingsRow): Promise<AlertFetchResult> {
  const alerts: Alert[] = [];
  const errors: AlertFetchError[] = [];

  for (const source of settings.zabbixSources) {
    if (!source.url) {
      continue;
    }
    const backoffUntil = getBackoffUntil("Zabbix", source.id);
    if (backoffUntil) {
      errors.push({
        source: sourceLabel("Zabbix", source.name),
        message: `Backoff active until ${backoffUntil}`
      });
      continue;
    }
    try {
      alerts.push(...(await fetchZabbixFromSource(source)));
      recordSourceSuccess("Zabbix", source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      recordSourceFailure("Zabbix", source.id, message);
      errors.push({
        source: sourceLabel("Zabbix", source.name),
        message
      });
    }
  }

  return { alerts, errors };
}

function collectStatusPageMonitors(statusPage: any) {
  const monitors: any[] = [];
  const groups = Array.isArray(statusPage?.publicGroupList) ? statusPage.publicGroupList : [];
  for (const group of groups) {
    if (Array.isArray(group?.monitorList)) {
      monitors.push(...group.monitorList);
    }
  }
  if (Array.isArray(statusPage?.monitorList)) {
    monitors.push(...statusPage.monitorList);
  }
  return monitors;
}

function latestHeartbeatStatus(heartbeatList: any[] | undefined) {
  if (!Array.isArray(heartbeatList) || heartbeatList.length === 0) {
    return null;
  }
  const latest = heartbeatList.reduce((acc, curr) =>
    (acc?.time ?? 0) >= (curr?.time ?? 0) ? acc : curr
  );
  return latest?.status ?? null;
}

async function fetchKumaStatusAlerts(source: KumaSource): Promise<Alert[]> {
  const normalized = normalizeKumaStatusSource(source);
  if (!normalized.slug) {
    return [];
  }
  const statusUrl = appendPath(normalized.baseUrl, `/api/status-page/${normalized.slug}`);
  const heartbeatUrl = appendPath(
    normalized.baseUrl,
    `/api/status-page/heartbeat/${normalized.slug}`
  );

  const [statusPage, heartbeatPayload] = await Promise.all([
    fetchKumaJson(statusUrl, source),
    fetchKumaJson(heartbeatUrl, source)
  ]);
  const monitors = collectStatusPageMonitors(statusPage);
  const heartbeatList = heartbeatPayload?.heartbeatList ?? {};

  return monitors
    .map((monitor) => {
      const id = String(monitor?.id ?? "");
      const name = monitor?.name ?? `id=${id}`;
      const heartbeats = heartbeatList?.[id] as any[] | undefined;
      const status = latestHeartbeatStatus(heartbeats);
      if (status !== 0 && status !== false) {
        return null;
      }
        return toAlert({
          source: "Kuma",
          sourceLabel: source.name,
          name,
          severity: "critical",
          message: withSourceName("Monitor down", source.name),
          timestamp: new Date().toISOString(),
          instance: name,
          idParts: [source.id, id, name]
        });
      })
    .filter(Boolean) as Alert[];
}

async function fetchKumaApiKeyAlerts(source: KumaSource): Promise<Alert[]> {
  const downMonitors = await fetchKumaMetricsDown(source);
  const now = new Date().toISOString();
  return downMonitors.map((name) =>
    toAlert({
      source: "Kuma",
      sourceLabel: source.name,
      name,
      severity: "critical",
      message: withSourceName("Monitor down", source.name),
      timestamp: now,
      instance: name,
      idParts: [source.id, name, now]
    })
  );
}

export async function fetchKumaSourceAlerts(source: KumaSource): Promise<Alert[]> {
  return source.mode === "apiKey"
    ? fetchKumaApiKeyAlerts(source)
    : fetchKumaStatusAlerts(source);
}

export async function fetchKumaTestLine(source: KumaSource): Promise<string | null> {
  if (source.mode === "apiKey") {
    const downMonitors = await fetchKumaMetricsDown(source);
    if (downMonitors.length === 0) {
      return null;
    }
    return `down\t${downMonitors[0]}`;
  }

  const normalized = normalizeKumaStatusSource(source);
  if (!normalized.slug) {
    return null;
  }
  const statusUrl = appendPath(normalized.baseUrl, `/api/status-page/${normalized.slug}`);
  const heartbeatUrl = appendPath(
    normalized.baseUrl,
    `/api/status-page/heartbeat/${normalized.slug}`
  );

  const [statusPage, heartbeatPayload] = await Promise.all([
    fetchKumaJson(statusUrl, source),
    fetchKumaJson(heartbeatUrl, source)
  ]);
  const monitors = collectStatusPageMonitors(statusPage);
  const heartbeatList = heartbeatPayload?.heartbeatList ?? {};

  for (const monitor of monitors) {
    const id = String(monitor?.id ?? "");
    const name = monitor?.name ?? `id=${id}`;
    const heartbeats = heartbeatList?.[id] as any[] | undefined;
    const status = latestHeartbeatStatus(heartbeats);
    if (status === 0 || status === false) {
      return `down\t${name}`;
    }
  }

  return null;
}

async function fetchKumaMetricsDown(source: KumaSource) {
  const metricsUrl = appendPath(source.baseUrl, "/metrics");
  const headers = source.key
    ? { Authorization: `Basic ${Buffer.from(`:${source.key}`).toString("base64")}` }
    : {};
  const response = await fetch(metricsUrl, {
    headers: { Accept: "text/plain", ...headers },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  const text = await response.text();
  const down: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((line) => {
    if (!line.includes("monitor_status{")) {
      return;
    }
    const match = line.match(/monitor_status\{[^}]*monitor_name="([^"]+)"[^}]*\}\s+([0-9.]+)/);
    if (!match) {
      return;
    }
    const name = match[1];
    const value = Number(match[2]);
    if (value === 0 && !seen.has(name)) {
      seen.add(name);
      down.push(name);
    }
  });
  return down;
}

export async function fetchKumaAlerts(settings: SettingsRow): Promise<AlertFetchResult> {
  const alerts: Alert[] = [];
  const errors: AlertFetchError[] = [];

  for (const source of settings.kumaSources) {
    if (!source.baseUrl) {
      continue;
    }
    const backoffUntil = getBackoffUntil("Kuma", source.id);
    if (backoffUntil) {
      errors.push({
        source: sourceLabel("Kuma", source.name),
        message: `Backoff active until ${backoffUntil}`
      });
      continue;
    }
    try {
      const sourceAlerts =
        source.mode === "apiKey"
          ? await fetchKumaApiKeyAlerts(source)
          : await fetchKumaStatusAlerts(source);
      alerts.push(...sourceAlerts);
      recordSourceSuccess("Kuma", source.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      recordSourceFailure("Kuma", source.id, message);
      errors.push({
        source: sourceLabel("Kuma", source.name),
        message
      });
    }
  }

  return { alerts, errors };
}
