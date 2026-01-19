export type AlertSource = "Prometheus" | "Zabbix" | "Kuma";
export type AlertSeverity = "critical" | "warning" | "info";

export interface ThemePalette {
  base: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
}

export interface BrandingSettings {
  logoUrl: string;
  faviconUrl: string;
}

export interface BackgroundSettings {
  gradient: number;
  glow: number;
  noise: number;
}

export interface AppearanceSettings {
  light: ThemePalette;
  dark: ThemePalette;
  branding: BrandingSettings;
  background: BackgroundSettings;
}

export interface SavedViewFilters {
  searchTerm: string;
  filterTags: string;
  filterSource: AlertSource | "All";
  filterSeverity: AlertSeverity | "All";
  filterTimeRange: "all" | "1h" | "24h" | "7d" | "30d";
  viewMode: "cards" | "table" | "split";
}

export interface SavedView {
  id: string;
  userId: string;
  name: string;
  filters: SavedViewFilters;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  source: AlertSource;
  sourceLabel?: string;
  name: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  instance?: string;
  ackStatus?: "active" | "acknowledged" | "resolved";
  ackNote?: string;
  ackUpdatedAt?: string;
  ackUpdatedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
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
  appearance: AppearanceSettings;
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
