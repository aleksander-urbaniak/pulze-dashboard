import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

import type { KumaSource, PrometheusSource, Settings, User, ZabbixSource } from "./types";

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

const defaultSettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30
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
      refresh_interval INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureColumn("settings", "prometheus_sources", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("settings", "zabbix_sources", "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn("settings", "kuma_sources", "TEXT NOT NULL DEFAULT '[]'");
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
        @refreshInterval,
        @createdAt,
        @updatedAt
      )`
    ).run({
      ...legacyDefaults,
      prometheusSources: JSON.stringify(defaultSettings.prometheusSources),
      zabbixSources: JSON.stringify(defaultSettings.zabbixSources),
      kumaSources: JSON.stringify(defaultSettings.kumaSources),
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
    refreshInterval: updates.refreshInterval ?? current.refreshInterval
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
    refreshInterval: next.refreshInterval,
    updatedAt: now
  });

  return getSettings();
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
