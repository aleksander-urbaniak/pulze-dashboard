export type AlertSource = "Prometheus" | "Zabbix" | "Kuma";
export type AlertSeverity = "critical" | "warning" | "info";

export interface Alert {
  id: string;
  source: AlertSource;
  sourceLabel?: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  instance?: string;
}

export interface PrometheusSource {
  id: string;
  name: string;
  url: string;
  authType: "none" | "basic" | "bearer";
  authValue: string;
}

export interface ZabbixSource {
  id: string;
  name: string;
  url: string;
  token: string;
}

export interface KumaSource {
  id: string;
  name: string;
  baseUrl: string;
  mode: "status" | "apiKey";
  slug: string;
  key: string;
}

export interface Settings {
  prometheusSources: PrometheusSource[];
  zabbixSources: ZabbixSource[];
  kumaSources: KumaSource[];
  refreshInterval: number;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
  role: "viewer" | "admin";
}
