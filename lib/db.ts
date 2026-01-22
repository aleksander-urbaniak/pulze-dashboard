import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import type {
  Alert,
  AppearanceSettings,
  AuditLogEntry,
  KumaSource,
  PrometheusSource,
  SavedView,
  SavedViewFilters,
  Settings,
  User,
  ZabbixSource
} from "./types";
import { defaultAppearance, normalizeAppearanceSettings } from "./appearance";

export interface UserRow extends User {
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsRow extends Settings {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertStateRow {
  alertId: string;
  status: "active" | "acknowledged" | "resolved";
  note: string;
  updatedBy: string | null;
  updatedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AlertLogRow extends Alert {
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface DataSourceHealthRow {
  sourceId: string;
  sourceType: "Prometheus" | "Zabbix" | "Kuma";
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  failCount: number;
  nextRetryAt: string | null;
}

export interface SavedViewRow extends SavedView {}

export interface AuditLogRow extends AuditLogEntry {}

const defaultSettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

const legacyDefaults = {
  prometheusUrl: "",
  prometheusAuthType: "none",
  prometheusAuthValue: "",
  zabbixUrl: "",
  zabbixToken: "",
  kumaBaseUrl: "",
  kumaMode: "status",
  kumaSlug: "",
  kumaKey: ""
};
const alertLogRetentionMs = 30 * 24 * 60 * 60 * 1000;

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initDb() {
  const dbPath = path.join(process.cwd(), "data", "pulze.db");
  ensureDirectory(dbPath);
  const globalDb = globalThis as unknown as { pulzeDb?: Database.Database };
  if (!globalDb.pulzeDb) {
    globalDb.pulzeDb = new Database(dbPath);
    globalDb.pulzeDb.pragma("journal_mode = WAL");
  }
  return globalDb.pulzeDb;
}

const db = initDb();

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function ensureColumn(table: string, column: string, definition: string) {
  const existing = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((info: any) => info.name === column);
  if (!existing) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function normalizePrometheusSource(input: Partial<PrometheusSource>): PrometheusSource {
  const authType =
    input.authType === "basic" || input.authType === "bearer" ? input.authType : "none";
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name?.trim() ?? "",
    url: input.url?.trim() ?? "",
    authType,
    authValue: input.authValue?.trim() ?? ""
  };
}

function normalizeZabbixSource(input: Partial<ZabbixSource>): ZabbixSource {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name?.trim() ?? "",
    url: input.url?.trim() ?? "",
    token: input.token?.trim() ?? ""
  };
}

function normalizeKumaSource(input: Partial<KumaSource>): KumaSource {
  const mode = input.mode === "apiKey" ? "apiKey" : "status";
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name?.trim() ?? "",
    baseUrl: input.baseUrl?.trim() ?? "",
    mode,
    slug: input.slug?.trim() ?? "",
    key: input.key?.trim() ?? ""
  };
}

const defaultSavedViewFilters: SavedViewFilters = {
  searchTerm: "",
  filterTags: "",
  filterSource: "All",
  filterSeverity: "All",
  filterTimeRange: "24h",
  viewMode: "cards"
};

function coercePrometheusSources(raw: unknown): PrometheusSource[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizePrometheusSource(item as Partial<PrometheusSource>));
}

function coerceZabbixSources(raw: unknown): ZabbixSource[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizeZabbixSource(item as Partial<ZabbixSource>));
}

function coerceKumaSources(raw: unknown): KumaSource[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizeKumaSource(item as Partial<KumaSource>));
}
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      prometheus_url TEXT NOT NULL,
      prometheus_auth_type TEXT NOT NULL,
      prometheus_auth_value TEXT NOT NULL,
      zabbix_url TEXT NOT NULL,
      zabbix_token TEXT NOT NULL,
      kuma_base_url TEXT NOT NULL,
      kuma_mode TEXT NOT NULL,
      kuma_slug TEXT NOT NULL,
      kuma_key TEXT NOT NULL,
      prometheus_sources TEXT NOT NULL DEFAULT '[]',
      zabbix_sources TEXT NOT NULL DEFAULT '[]',
      kuma_sources TEXT NOT NULL DEFAULT '[]',
      appearance_json TEXT NOT NULL DEFAULT '{}',
      refresh_interval INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_states (
      alert_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      updated_by TEXT,
      updated_at TEXT NOT NULL,
      acknowledged_at TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_log (
      alert_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_label TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      instance TEXT NOT NULL DEFAULT '',
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_source_health (
      source_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      last_success_at TEXT,
      last_error_at TEXT,
      last_error_message TEXT,
      fail_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT,
      PRIMARY KEY (source_id, source_type)
    );

    CREATE TABLE IF NOT EXISTS saved_views (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      filters_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureColumn("settings", "prometheus_sources", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("settings", "zabbix_sources", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("settings", "kuma_sources", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("settings", "appearance_json", "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn("users", "avatar_url", "TEXT NOT NULL DEFAULT ''");
}

migrate();

function toUser(row: any): UserRow {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    avatarUrl: row.avatar_url ?? "",
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toSettings(row: any): SettingsRow {
  const rawPrometheus = safeJsonParse<unknown>(row.prometheus_sources, []);
  const rawZabbix = safeJsonParse<unknown>(row.zabbix_sources, []);
  const rawKuma = safeJsonParse<unknown>(row.kuma_sources, []);
  const rawAppearance = safeJsonParse<AppearanceSettings>(
    row.appearance_json,
    defaultSettings.appearance
  );
  const appearance = normalizeAppearanceSettings(rawAppearance);
  const prometheusSources = coercePrometheusSources(rawPrometheus);
  const zabbixSources = coerceZabbixSources(rawZabbix);
  const kumaSources = coerceKumaSources(rawKuma);

  if (prometheusSources.length === 0 && row.prometheus_url) {
    prometheusSources.push(
      normalizePrometheusSource({
        id: "legacy-prometheus",
        name: "Legacy",
        url: row.prometheus_url,
        authType: row.prometheus_auth_type,
        authValue: row.prometheus_auth_value
      })
    );
  }
  if (zabbixSources.length === 0 && row.zabbix_url) {
    zabbixSources.push(
      normalizeZabbixSource({
        id: "legacy-zabbix",
        name: "Legacy",
        url: row.zabbix_url,
        token: row.zabbix_token
      })
    );
  }
  if (kumaSources.length === 0 && row.kuma_base_url) {
    kumaSources.push(
      normalizeKumaSource({
        id: "legacy-kuma",
        name: "Legacy",
        baseUrl: row.kuma_base_url,
        mode: row.kuma_mode,
        slug: row.kuma_slug,
        key: row.kuma_key
      })
    );
  }

  return {
    id: row.id,
    prometheusSources,
    zabbixSources,
    kumaSources,
    refreshInterval: row.refresh_interval,
    appearance,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toAlertLogRow(row: any): AlertLogRow {
  return {
    id: row.alert_id,
    source: row.source,
    sourceLabel: row.source_label || undefined,
    name: row.name,
    severity: row.severity,
    message: row.message,
    timestamp: row.timestamp,
    instance: row.instance || undefined,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  };
}

function toDataSourceHealthRow(row: any): DataSourceHealthRow {
  return {
    sourceId: row.source_id,
    sourceType: row.source_type,
    lastSuccessAt: row.last_success_at ?? null,
    lastErrorAt: row.last_error_at ?? null,
    lastErrorMessage: row.last_error_message ?? null,
    failCount: Number(row.fail_count ?? 0),
    nextRetryAt: row.next_retry_at ?? null
  };
}

function toSavedView(row: any): SavedViewRow {
  const filters = safeJsonParse<SavedViewFilters>(row.filters_json, defaultSavedViewFilters);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    filters,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function seed() {
  const settingsRow = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (!settingsRow) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO settings (
        id,
        prometheus_url,
        prometheus_auth_type,
        prometheus_auth_value,
        zabbix_url,
        zabbix_token,
        kuma_base_url,
        kuma_mode,
        kuma_slug,
        kuma_key,
        prometheus_sources,
        zabbix_sources,
        kuma_sources,
        appearance_json,
        refresh_interval,
        created_at,
        updated_at
      ) VALUES (
        1,
        @prometheusUrl,
        @prometheusAuthType,
        @prometheusAuthValue,
        @zabbixUrl,
        @zabbixToken,
        @kumaBaseUrl,
        @kumaMode,
        @kumaSlug,
        @kumaKey,
        @prometheusSources,
        @zabbixSources,
        @kumaSources,
        @appearanceJson,
        @refreshInterval,
        @createdAt,
        @updatedAt
      )`
    ).run({
      ...legacyDefaults,
      prometheusSources: JSON.stringify(defaultSettings.prometheusSources),
      zabbixSources: JSON.stringify(defaultSettings.zabbixSources),
      kumaSources: JSON.stringify(defaultSettings.kumaSources),
      appearanceJson: JSON.stringify(defaultSettings.appearance),
      refreshInterval: defaultSettings.refreshInterval,
      createdAt: now,
      updatedAt: now
    });
  }
}

seed();

export function listUsers(): UserRow[] {
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  return rows.map(toUser);
}

export function countUsers(): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count;
}

export function getUserById(id: string): UserRow | null {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return row ? toUser(row) : null;
}

export function getUserByUsername(username: string): UserRow | null {
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  return row ? toUser(row) : null;
}

export function createUser(input: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  password: string;
  role: "viewer" | "admin";
}): UserRow {
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync(input.password, 10);
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (id, username, first_name, last_name, email, avatar_url, password_hash, role, created_at, updated_at)
     VALUES (@id, @username, @firstName, @lastName, @email, @avatarUrl, @passwordHash, @role, @createdAt, @updatedAt)`
  ).run({
    id,
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    avatarUrl: input.avatarUrl ?? "",
    passwordHash,
    role: input.role,
    createdAt: now,
    updatedAt: now
  });
  return getUserById(id) as UserRow;
}

export function updateUser(
  id: string,
  updates: Partial<{
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string;
    passwordHash: string;
    role: "viewer" | "admin";
  }>
): UserRow {
  const fields: string[] = [];
  const params: Record<string, string> = { id };

  if (updates.username !== undefined) {
    fields.push("username = @username");
    params.username = updates.username;
  }
  if (updates.firstName !== undefined) {
    fields.push("first_name = @firstName");
    params.firstName = updates.firstName;
  }
  if (updates.lastName !== undefined) {
    fields.push("last_name = @lastName");
    params.lastName = updates.lastName;
  }
  if (updates.email !== undefined) {
    fields.push("email = @email");
    params.email = updates.email;
  }
  if (updates.avatarUrl !== undefined) {
    fields.push("avatar_url = @avatarUrl");
    params.avatarUrl = updates.avatarUrl;
  }
  if (updates.passwordHash !== undefined) {
    fields.push("password_hash = @passwordHash");
    params.passwordHash = updates.passwordHash;
  }
  if (updates.role !== undefined) {
    fields.push("role = @role");
    params.role = updates.role;
  }

  if (fields.length === 0) {
    return getUserById(id) as UserRow;
  }

  params.updatedAt = new Date().toISOString();
  db.prepare(
    `UPDATE users SET ${fields.join(", ")}, updated_at = @updatedAt WHERE id = @id`
  ).run(params);

  return getUserById(id) as UserRow;
}

export function deleteUser(id: string) {
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function getSettings(): SettingsRow {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  return toSettings(row);
}

export function updateSettings(updates: Partial<Settings>): SettingsRow {
  const current = getSettings();
  const next: Settings = {
    prometheusSources: updates.prometheusSources ?? current.prometheusSources,
    zabbixSources: updates.zabbixSources ?? current.zabbixSources,
    kumaSources: updates.kumaSources ?? current.kumaSources,
    refreshInterval: updates.refreshInterval ?? current.refreshInterval,
    appearance: updates.appearance ?? current.appearance
  };

  const normalizedPrometheus = next.prometheusSources.map(normalizePrometheusSource);
  const normalizedZabbix = next.zabbixSources.map(normalizeZabbixSource);
  const normalizedKuma = next.kumaSources.map(normalizeKumaSource);
  const primaryPrometheus = normalizedPrometheus[0];
  const primaryZabbix = normalizedZabbix[0];
  const primaryKuma = normalizedKuma[0];

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE settings SET
      prometheus_url = @prometheusUrl,
      prometheus_auth_type = @prometheusAuthType,
      prometheus_auth_value = @prometheusAuthValue,
      zabbix_url = @zabbixUrl,
      zabbix_token = @zabbixToken,
      kuma_base_url = @kumaBaseUrl,
      kuma_mode = @kumaMode,
      kuma_slug = @kumaSlug,
      kuma_key = @kumaKey,
      prometheus_sources = @prometheusSources,
      zabbix_sources = @zabbixSources,
      kuma_sources = @kumaSources,
      appearance_json = @appearanceJson,
      refresh_interval = @refreshInterval,
      updated_at = @updatedAt
     WHERE id = 1`
  ).run({
    prometheusUrl: primaryPrometheus?.url ?? "",
    prometheusAuthType: primaryPrometheus?.authType ?? "none",
    prometheusAuthValue: primaryPrometheus?.authValue ?? "",
    zabbixUrl: primaryZabbix?.url ?? "",
    zabbixToken: primaryZabbix?.token ?? "",
    kumaBaseUrl: primaryKuma?.baseUrl ?? "",
    kumaMode: primaryKuma?.mode ?? "status",
    kumaSlug: primaryKuma?.slug ?? "",
    kumaKey: primaryKuma?.key ?? "",
    prometheusSources: JSON.stringify(normalizedPrometheus),
    zabbixSources: JSON.stringify(normalizedZabbix),
    kumaSources: JSON.stringify(normalizedKuma),
    appearanceJson: JSON.stringify(next.appearance),
    refreshInterval: next.refreshInterval,
    updatedAt: now
  });

  return getSettings();
}

export function getAlertStatesByIds(alertIds: string[]): Map<string, AlertStateRow> {
  if (alertIds.length === 0) {
    return new Map();
  }
  const placeholders = alertIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT * FROM alert_states WHERE alert_id IN (${placeholders})`
    )
    .all(...alertIds) as Array<any>;
  const map = new Map<string, AlertStateRow>();
  rows.forEach((row) => {
    map.set(row.alert_id, {
      alertId: row.alert_id,
      status: row.status,
      note: row.note ?? "",
      updatedBy: row.updated_by ?? null,
      updatedAt: row.updated_at,
      acknowledgedAt: row.acknowledged_at ?? null,
      resolvedAt: row.resolved_at ?? null,
      createdAt: row.created_at
    });
  });
  return map;
}

export function upsertAlertState(params: {
  alertId: string;
  status: "active" | "acknowledged" | "resolved";
  note?: string | null;
  userId: string | null;
}): AlertStateRow {
  const now = new Date().toISOString();
  const acknowledgedAt = params.status === "acknowledged" ? now : null;
  const resolvedAt = params.status === "resolved" ? now : null;
  const noteInsert = params.note ?? "";
  const noteUpdate = params.note ?? null;
  db.prepare(
    `INSERT INTO alert_states (
        alert_id,
        status,
        note,
        updated_by,
        updated_at,
        acknowledged_at,
        resolved_at,
        created_at
      ) VALUES (
        @alertId,
        @status,
        @noteInsert,
        @updatedBy,
        @updatedAt,
        @acknowledgedAt,
        @resolvedAt,
        @createdAt
      )
      ON CONFLICT(alert_id) DO UPDATE SET
        status = excluded.status,
        note = CASE
          WHEN @noteUpdate IS NULL THEN alert_states.note
          ELSE @noteUpdate
        END,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at,
        acknowledged_at = excluded.acknowledged_at,
        resolved_at = excluded.resolved_at`
  ).run({
    alertId: params.alertId,
    status: params.status,
    noteInsert,
    noteUpdate,
    updatedBy: params.userId,
    updatedAt: now,
    acknowledgedAt,
    resolvedAt,
    createdAt: now
  });
  const row = db
    .prepare("SELECT * FROM alert_states WHERE alert_id = ?")
    .get(params.alertId) as any;
  return {
    alertId: row.alert_id,
    status: row.status,
    note: row.note ?? "",
    updatedBy: row.updated_by ?? null,
    updatedAt: row.updated_at,
    acknowledgedAt: row.acknowledged_at ?? null,
    resolvedAt: row.resolved_at ?? null,
    createdAt: row.created_at
  };
}

export function resolveMissingAlertStates(activeAlertIds: string[]) {
  const now = new Date().toISOString();
  if (activeAlertIds.length === 0) {
    db.prepare(
      `UPDATE alert_states
        SET status = 'resolved',
            resolved_at = @resolvedAt,
            updated_at = @updatedAt
        WHERE status != 'resolved'`
    ).run({ resolvedAt: now, updatedAt: now });
    return;
  }
  const placeholders = activeAlertIds.map(() => "?").join(", ");
  db.prepare(
    `UPDATE alert_states
      SET status = 'resolved',
          resolved_at = ?,
          updated_at = ?
      WHERE status != 'resolved' AND alert_id NOT IN (${placeholders})`
  ).run(now, now, ...activeAlertIds);
}

export function upsertAlertStatesBulk(params: {
  alertIds: string[];
  status: "active" | "acknowledged" | "resolved";
  note?: string | null;
  userId: string | null;
}): AlertStateRow[] {
  if (params.alertIds.length === 0) {
    return [];
  }
  const now = new Date().toISOString();
  const acknowledgedAt = params.status === "acknowledged" ? now : null;
  const resolvedAt = params.status === "resolved" ? now : null;
  const noteInsert = params.note ?? "";
  const noteUpdate = params.note ?? null;
  const statement = db.prepare(
    `INSERT INTO alert_states (
        alert_id,
        status,
        note,
        updated_by,
        updated_at,
        acknowledged_at,
        resolved_at,
        created_at
      ) VALUES (
        @alertId,
        @status,
        @noteInsert,
        @updatedBy,
        @updatedAt,
        @acknowledgedAt,
        @resolvedAt,
        @createdAt
      )
      ON CONFLICT(alert_id) DO UPDATE SET
        status = excluded.status,
        note = CASE
          WHEN @noteUpdate IS NULL THEN alert_states.note
          ELSE @noteUpdate
        END,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at,
        acknowledged_at = excluded.acknowledged_at,
        resolved_at = excluded.resolved_at`
  );
  const runMany = db.transaction((alertIds: string[]) => {
    alertIds.forEach((alertId) => {
      statement.run({
        alertId,
        status: params.status,
        noteInsert,
        noteUpdate,
        updatedBy: params.userId,
        updatedAt: now,
        acknowledgedAt,
        resolvedAt,
        createdAt: now
      });
    });
  });
  runMany(params.alertIds);
  return Array.from(getAlertStatesByIds(params.alertIds).values());
}

export function upsertAlertLogEntries(alerts: Alert[]) {
  if (alerts.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO alert_log (
        alert_id,
        source,
        source_label,
        name,
        severity,
        message,
        timestamp,
        instance,
        first_seen_at,
        last_seen_at
      ) VALUES (
        @alertId,
        @source,
        @sourceLabel,
        @name,
        @severity,
        @message,
        @timestamp,
        @instance,
        @firstSeenAt,
        @lastSeenAt
      )
      ON CONFLICT(alert_id) DO UPDATE SET
        source = excluded.source,
        source_label = excluded.source_label,
        name = excluded.name,
        severity = excluded.severity,
        message = excluded.message,
        instance = excluded.instance,
        last_seen_at = excluded.last_seen_at`
  );
  const rows = alerts.map((alert) => ({
    alertId: alert.id,
    source: alert.source,
    sourceLabel: alert.sourceLabel ?? "",
    name: alert.name,
    severity: alert.severity,
    message: alert.message,
    timestamp: alert.timestamp,
    instance: alert.instance ?? "",
    firstSeenAt: now,
    lastSeenAt: now
  }));
  const insertMany = db.transaction((entries: typeof rows) => {
    entries.forEach((entry) => insert.run(entry));
  });
  insertMany(rows);
  pruneAlertLogBefore(new Date(Date.now() - alertLogRetentionMs).toISOString());
}

export function pruneAlertLogBefore(cutoff: string) {
  db.prepare("DELETE FROM alert_log WHERE last_seen_at < ?").run(cutoff);
}

export function listAlertLogSince(cutoff: string): AlertLogRow[] {
  const rows = db
    .prepare(
      `SELECT * FROM alert_log
       WHERE last_seen_at >= ?
       ORDER BY timestamp DESC`
    )
    .all(cutoff) as Array<any>;
  return rows.map(toAlertLogRow);
}

export function countAlertLogSince(cutoff: string, query?: string): number {
  const trimmed = (query ?? "").trim();
  const like = `%${trimmed}%`;
  if (!trimmed) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM alert_log WHERE last_seen_at >= ?")
      .get(cutoff) as { count: number };
    return row?.count ?? 0;
  }
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM alert_log
       WHERE last_seen_at >= ?
         AND (
           timestamp LIKE ?
           OR name LIKE ?
           OR severity LIKE ?
           OR source_label LIKE ?
           OR source LIKE ?
           OR instance LIKE ?
         )`
    )
    .get(cutoff, like, like, like, like, like, like) as { count: number };
  return row?.count ?? 0;
}

export function listAlertLogPageSince(params: {
  cutoff: string;
  query?: string;
  limit: number;
  offset: number;
}): AlertLogRow[] {
  const trimmed = (params.query ?? "").trim();
  const like = `%${trimmed}%`;
  const rows = trimmed
    ? db
        .prepare(
          `SELECT * FROM alert_log
           WHERE last_seen_at >= ?
             AND (
               timestamp LIKE ?
               OR name LIKE ?
               OR severity LIKE ?
               OR source_label LIKE ?
               OR source LIKE ?
               OR instance LIKE ?
             )
           ORDER BY timestamp DESC
           LIMIT ?
           OFFSET ?`
        )
        .all(
          params.cutoff,
          like,
          like,
          like,
          like,
          like,
          like,
          params.limit,
          params.offset
        )
    : db
        .prepare(
          `SELECT * FROM alert_log
           WHERE last_seen_at >= ?
           ORDER BY timestamp DESC
           LIMIT ?
           OFFSET ?`
        )
        .all(params.cutoff, params.limit, params.offset);
  return (rows as Array<any>).map(toAlertLogRow);
}

export function getSourceHealth(
  sourceType: DataSourceHealthRow["sourceType"],
  sourceId: string
): DataSourceHealthRow | null {
  const row = db
    .prepare(
      "SELECT * FROM data_source_health WHERE source_id = ? AND source_type = ?"
    )
    .get(sourceId, sourceType) as any;
  return row ? toDataSourceHealthRow(row) : null;
}

export function listSourceHealth(): DataSourceHealthRow[] {
  const rows = db.prepare("SELECT * FROM data_source_health").all() as Array<any>;
  return rows.map(toDataSourceHealthRow);
}

export function recordSourceSuccess(
  sourceType: DataSourceHealthRow["sourceType"],
  sourceId: string
) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO data_source_health (
        source_id,
        source_type,
        last_success_at,
        last_error_at,
        last_error_message,
        fail_count,
        next_retry_at
      ) VALUES (
        @sourceId,
        @sourceType,
        @lastSuccessAt,
        NULL,
        NULL,
        0,
        NULL
      )
      ON CONFLICT(source_id, source_type) DO UPDATE SET
        last_success_at = excluded.last_success_at,
        last_error_at = NULL,
        last_error_message = NULL,
        fail_count = 0,
        next_retry_at = NULL`
  ).run({
    sourceId,
    sourceType,
    lastSuccessAt: now
  });
}

export function recordSourceFailure(
  sourceType: DataSourceHealthRow["sourceType"],
  sourceId: string,
  message: string
) {
  const now = new Date().toISOString();
  const current = getSourceHealth(sourceType, sourceId);
  const nextFailCount = (current?.failCount ?? 0) + 1;
  const backoffMs = Math.min(10 * 60 * 1000, 10000 * 2 ** Math.max(0, nextFailCount - 1));
  const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();
  db.prepare(
    `INSERT INTO data_source_health (
        source_id,
        source_type,
        last_success_at,
        last_error_at,
        last_error_message,
        fail_count,
        next_retry_at
      ) VALUES (
        @sourceId,
        @sourceType,
        @lastSuccessAt,
        @lastErrorAt,
        @lastErrorMessage,
        @failCount,
        @nextRetryAt
      )
      ON CONFLICT(source_id, source_type) DO UPDATE SET
        last_error_at = excluded.last_error_at,
        last_error_message = excluded.last_error_message,
        fail_count = excluded.fail_count,
        next_retry_at = excluded.next_retry_at`
  ).run({
    sourceId,
    sourceType,
    lastSuccessAt: current?.lastSuccessAt ?? null,
    lastErrorAt: now,
    lastErrorMessage: message,
    failCount: nextFailCount,
    nextRetryAt
  });
}

export function listSavedViews(userId: string): SavedViewRow[] {
  const rows = db
    .prepare("SELECT * FROM saved_views WHERE user_id = ? ORDER BY updated_at DESC")
    .all(userId) as Array<any>;
  return rows.map(toSavedView);
}

export function createSavedView(
  userId: string,
  name: string,
  filters: SavedViewFilters
): SavedViewRow {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO saved_views (id, user_id, name, filters_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, name, JSON.stringify(filters), now, now);
  const row = db.prepare("SELECT * FROM saved_views WHERE id = ?").get(id);
  return toSavedView(row);
}

export function deleteSavedView(userId: string, id: string) {
  db.prepare("DELETE FROM saved_views WHERE id = ? AND user_id = ?").run(id, userId);
}

export function logAudit(action: string, userId: string | null, details: Record<string, unknown>) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_log (id, user_id, action, details, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(crypto.randomUUID(), userId, action, JSON.stringify(details ?? {}), now);
}

export function listAuditLogs(limit = 100, offset = 0): Array<
  AuditLogEntry & { userName: string | null; userEmail: string | null }
> {
  const rows = db
    .prepare(
      `SELECT audit_log.*, users.first_name, users.last_name, users.email
       FROM audit_log
       LEFT JOIN users ON users.id = audit_log.user_id
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<any>;
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id ?? null,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
    userName: row.first_name || row.last_name ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : null,
    userEmail: row.email ?? null
  }));
}

export function countAuditLogs() {
  const row = db.prepare("SELECT COUNT(*) as total FROM audit_log").get() as {
    total: number;
  };
  return row?.total ?? 0;
}

export function createSession(userId: string, ttlHours = 24 * 7) {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}

export function getUserBySession(token: string): UserRow | null {
  const session = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .get(token) as { user_id: string; expires_at: number } | undefined;
  if (!session) {
    return null;
  }
  if (session.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return getUserById(session.user_id);
}

export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
