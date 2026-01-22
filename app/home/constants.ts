export const sourceOptions = ["All", "Prometheus", "Zabbix", "Kuma"] as const;
export type SourceOption = (typeof sourceOptions)[number];

export const severityOptions = ["All", "critical", "warning", "info"] as const;
export type SeverityOption = (typeof severityOptions)[number];

export const viewModeOptions = ["cards", "table", "split"] as const;
export type ViewMode = (typeof viewModeOptions)[number];

export const filterStorageKey = "pulze-dashboard:filters";
export const filterCookieKey = "pulze_dashboard_filters";
export const filterCookieMaxAge = 60 * 60 * 24 * 60;
