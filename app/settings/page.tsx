"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import clsx from "clsx";

import Sidebar from "../../components/Sidebar";
import { applyAppearanceToDocument, defaultAppearance } from "../../lib/appearance";
import type { AppearanceSettings, KumaSource, PrometheusSource, Settings, ThemePalette, User, ZabbixSource } from "../../lib/types";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

type SettingsResponse = { settings: Settings; canEdit: boolean };
type UserResponse = { user: User };
type UsersResponse = { users: User[] };
type AuditLogResponse = {
  logs: Array<{
    id: string;
    userId: string | null;
    action: string;
    details: string;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
  }>;
};
type TabKey = "data" | "appearance" | "users" | "audit";
type TestState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  sampleLine?: string | null;
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}`;
}

function createPrometheusSource(): PrometheusSource {
  return {
    id: createId(),
    name: "",
    url: "",
    authType: "none",
    authValue: ""
  };
}

function createZabbixSource(): ZabbixSource {
  return {
    id: createId(),
    name: "",
    url: "",
    token: ""
  };
}

function createKumaSource(): KumaSource {
  return {
    id: createId(),
    name: "",
    baseUrl: "",
    mode: "status",
    slug: "",
    key: ""
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("data");
  const [settingsDraft, setSettingsDraft] = useState<Settings>(emptySettings);
  const [canEditSettings, setCanEditSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatarUrl: "",
    password: ""
  });
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestState>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse["logs"]>([]);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "viewer" as "viewer" | "admin"
  });
  const [isLoading, setIsLoading] = useState(true);
  const appearanceFields: Array<{ key: keyof ThemePalette; label: string }> = [
    { key: "base", label: "Base" },
    { key: "surface", label: "Surface" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Muted" },
    { key: "accent", label: "Accent" },
    { key: "accentSoft", label: "Accent Soft" },
    { key: "border", label: "Border" }
  ];

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      void loadSettings();
      if (user.role === "admin") {
        void loadUsers();
      }
    }
  }, [user]);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const settingsTabItems = useMemo(() => {
    const items = [
      { value: "data", label: "Data Sources" },
      { value: "appearance", label: "Appearance" },
      { value: "users", label: "Users" }
    ];
    if (isAdmin) {
      items.push({ value: "audit", label: "Audit Log" });
    }
    return items;
  }, [isAdmin]);
  useEffect(() => {
    if (settingsDraft.appearance) {
      applyAppearanceToDocument(settingsDraft.appearance);
    }
  }, [settingsDraft.appearance]);

  useEffect(() => {
    if (activeTab === "audit" && isAdmin) {
      void loadAuditLogs();
    }
  }, [activeTab, isAdmin]);
  const hasInvalidLabels = useMemo(() => {
    const missingPrometheus = settingsDraft.prometheusSources.some(
      (source) => source.url && !source.name.trim()
    );
    const missingZabbix = settingsDraft.zabbixSources.some(
      (source) => source.url && !source.name.trim()
    );
    const missingKuma = settingsDraft.kumaSources.some(
      (source) => source.baseUrl && !source.name.trim()
    );
    return missingPrometheus || missingZabbix || missingKuma;
  }, [settingsDraft]);

  async function loadSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setIsLoading(false);
      router.push("/");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setProfileDraft({
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      username: data.user.username,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl ?? "",
      password: ""
    });
    setIsLoading(false);
  }

  async function loadSettings() {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as SettingsResponse;
    setSettingsDraft(data.settings);
    setCanEditSettings(data.canEdit);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function saveSettings() {
    setSettingsStatus(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsDraft)
    });
    if (!response.ok) {
      const data = await response.json();
      setSettingsStatus(data.error ?? "Failed to save settings");
      return;
    }
    const data = (await response.json()) as SettingsResponse;
    setSettingsDraft(data.settings);
    setSettingsStatus("Settings saved.");
  }

  async function saveProfile() {
    setProfileStatus(null);
    const payload = {
      ...profileDraft,
      password: profileDraft.password.trim() === "" ? undefined : profileDraft.password
    };
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json();
      setProfileStatus(data.error ?? "Failed to update profile");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setProfileDraft({
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      username: data.user.username,
      email: data.user.email,
      avatarUrl: data.user.avatarUrl ?? "",
      password: ""
    });
    setProfileStatus("Profile updated.");
  }

  async function loadUsers() {
    if (!user || user.role !== "admin") {
      return;
    }
    const response = await fetch("/api/users");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as UsersResponse;
    setUsers(data.users);
  }

  async function loadAuditLogs() {
    if (!isAdmin) {
      return;
    }
    setIsLoadingAudit(true);
    setAuditStatus(null);
    const response = await fetch("/api/audit");
    if (!response.ok) {
      setIsLoadingAudit(false);
      setAuditStatus("Failed to load audit log.");
      return;
    }
    const data = (await response.json()) as AuditLogResponse;
    setAuditLogs(data.logs ?? []);
    setIsLoadingAudit(false);
  }

  async function createNewUser() {
    setUserStatus(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser)
    });
    if (!response.ok) {
      const data = await response.json();
      setUserStatus(data.error ?? "Failed to create user");
      return;
    }
    setUserStatus("User created.");
    setNewUser({
      username: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "viewer"
    });
    await loadUsers();
  }

  async function updateUserRole(id: string, role: "viewer" | "admin") {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role })
    });
    await loadUsers();
  }

  function updatePrometheusSource(id: string, updates: Partial<PrometheusSource>) {
    setSettingsDraft((prev) => ({
      ...prev,
      prometheusSources: prev.prometheusSources.map((source) =>
        source.id === id ? { ...source, ...updates } : source
      )
    }));
  }

  function updateZabbixSource(id: string, updates: Partial<ZabbixSource>) {
    setSettingsDraft((prev) => ({
      ...prev,
      zabbixSources: prev.zabbixSources.map((source) =>
        source.id === id ? { ...source, ...updates } : source
      )
    }));
  }

  function updateAppearance(
    mode: "light" | "dark",
    key: keyof ThemePalette,
    value: string
  ) {
    setSettingsDraft((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [mode]: {
          ...prev.appearance[mode],
          [key]: value
        }
      }
    }));
  }

  function updateBranding(key: "logoUrl" | "faviconUrl", value: string) {
    setSettingsDraft((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        branding: {
          ...prev.appearance.branding,
          [key]: value
        }
      }
    }));
  }

  function updateBackground(key: "gradient" | "glow" | "noise", value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    setSettingsDraft((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        background: {
          ...prev.appearance.background,
          [key]: safeValue
        }
      }
    }));
  }

  function handleAssetUpload(file: File | null, onChange: (value: string) => void) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function formatAuditDetails(details: string) {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  }

  function updateKumaSource(id: string, updates: Partial<KumaSource>) {
    setSettingsDraft((prev) => ({
      ...prev,
      kumaSources: prev.kumaSources.map((source) =>
        source.id === id ? { ...source, ...updates } : source
      )
    }));
  }

  function testKey(type: "Prometheus" | "Zabbix" | "Kuma", id: string) {
    return `${type}-${id}`;
  }

  async function testSource(
    type: "Prometheus" | "Zabbix" | "Kuma",
    source: PrometheusSource | ZabbixSource | KumaSource
  ) {
    const key = testKey(type, source.id);
    setTestResults((prev) => ({
      ...prev,
      [key]: { status: "loading", message: "Testing connection..." }
    }));

    const response = await fetch("/api/test-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, source })
    });

    if (!response.ok) {
      const data = await response.json();
      setTestResults((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          message: data.error ?? "Test failed"
        }
      }));
      return;
    }

    const data = (await response.json()) as { message: string; sampleLine?: string | null };
    setTestResults((prev) => ({
      ...prev,
      [key]: {
        status: "success",
        message: data.message ?? "Connected.",
        sampleLine: data.sampleLine ?? null
      }
    }));
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="rounded-3xl border border-border bg-surface/90 px-6 py-4 text-sm text-muted shadow-card">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        settingsTabs={{
          items: settingsTabItems,
          active: activeTab,
          onChange: (value) => setActiveTab(value as TabKey)
        }}
      />
      <div className="flex-1">
        <main className="mx-auto max-w-6xl px-6 py-10">
        {activeTab === "data" ? (
          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Data Sources</p>
                    <h2 className="text-2xl font-semibold">Alert Fetch Settings</h2>
                  </div>
                  <button
                    type="button"
                    onClick={saveSettings}
                    disabled={!canEditSettings || hasInvalidLabels}
                    className={clsx(
                      "rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]",
                      canEditSettings ? "bg-accent text-white" : "border border-border text-muted"
                    )}
                  >
                    Save
                  </button>
                </div>
                {settingsStatus ? <p className="mt-3 text-sm text-muted">{settingsStatus}</p> : null}
                {hasInvalidLabels ? (
                  <p className="mt-2 text-sm text-red-500">
                    Every monitoring source needs a label before saving.
                  </p>
                ) : null}

                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl border border-border bg-base/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Prometheus / Alertmanager</h3>
                        <p className="text-xs text-muted">Add as many Alertmanager endpoints as needed.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            prometheusSources: [...prev.prometheusSources, createPrometheusSource()]
                          }))
                        }
                        disabled={!canEditSettings}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      {settingsDraft.prometheusSources.length === 0 ? (
                        <p className="text-sm text-muted">No Prometheus sources added yet.</p>
                      ) : (
                        settingsDraft.prometheusSources.map((source) => {
                          const isMissingLabel = Boolean(source.url) && !source.name.trim();
                          return (
                            <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <input
                                  value={source.name}
                                  onChange={(event) =>
                                    updatePrometheusSource(source.id, { name: event.target.value })
                                  }
                                  placeholder="Label (required)"
                                  disabled={!canEditSettings}
                                  className={clsx(
                                    "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                                    isMissingLabel ? "border-red-500" : "border-border"
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => testSource("Prometheus", source)}
                                    disabled={!canEditSettings || !source.url}
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                  >
                                    Test
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSettingsDraft((prev) => ({
                                        ...prev,
                                        prometheusSources: prev.prometheusSources.filter(
                                          (entry) => entry.id !== source.id
                                        )
                                      }))
                                    }
                                    disabled={!canEditSettings}
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <input
                                  value={source.url}
                                  onChange={(event) =>
                                    updatePrometheusSource(source.id, { url: event.target.value })
                                  }
                                  placeholder="https://alertmanager.example.com"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                                <select
                                  value={source.authType}
                                  onChange={(event) =>
                                    updatePrometheusSource(source.id, {
                                      authType: event.target.value as PrometheusSource["authType"]
                                    })
                                  }
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                >
                                  <option value="none">No auth</option>
                                  <option value="basic">Basic (user:pass)</option>
                                  <option value="bearer">Bearer token</option>
                                </select>
                                <input
                                  value={source.authValue}
                                  onChange={(event) =>
                                    updatePrometheusSource(source.id, { authValue: event.target.value })
                                  }
                                  placeholder="user:password or token"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm md:col-span-2"
                                />
                              </div>
                              {testResults[testKey("Prometheus", source.id)] ? (
                                <div
                                  className={clsx(
                                    "mt-3 rounded-xl border px-3 py-2 text-xs",
                                    testResults[testKey("Prometheus", source.id)].status === "error"
                                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                                      : "border-border bg-base/50 text-muted"
                                  )}
                                >
                                  <p className="font-semibold">
                                    {testResults[testKey("Prometheus", source.id)].message}
                                  </p>
                                  {testResults[testKey("Prometheus", source.id)].sampleLine ? (
                                    <p className="mt-1 font-mono text-muted">
                                      Sample:{" "}
                                      {testResults[testKey("Prometheus", source.id)].sampleLine}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-base/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Zabbix</h3>
                        <p className="text-xs text-muted">Support multiple Zabbix instances.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            zabbixSources: [...prev.zabbixSources, createZabbixSource()]
                          }))
                        }
                        disabled={!canEditSettings}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      {settingsDraft.zabbixSources.length === 0 ? (
                        <p className="text-sm text-muted">No Zabbix sources added yet.</p>
                      ) : (
                        settingsDraft.zabbixSources.map((source) => {
                          const isMissingLabel = Boolean(source.url) && !source.name.trim();
                          return (
                            <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <input
                                  value={source.name}
                                  onChange={(event) =>
                                    updateZabbixSource(source.id, { name: event.target.value })
                                  }
                                  placeholder="Label (required)"
                                  disabled={!canEditSettings}
                                  className={clsx(
                                    "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                                    isMissingLabel ? "border-red-500" : "border-border"
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => testSource("Zabbix", source)}
                                    disabled={!canEditSettings || !source.url}
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                  >
                                    Test
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSettingsDraft((prev) => ({
                                        ...prev,
                                        zabbixSources: prev.zabbixSources.filter(
                                          (entry) => entry.id !== source.id
                                        )
                                      }))
                                    }
                                    disabled={!canEditSettings}
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <input
                                  value={source.url}
                                  onChange={(event) =>
                                    updateZabbixSource(source.id, { url: event.target.value })
                                  }
                                  placeholder="https://zabbix.example.com"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                                <input
                                  value={source.token}
                                  onChange={(event) =>
                                    updateZabbixSource(source.id, { token: event.target.value })
                                  }
                                  placeholder="API token"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                              </div>
                              {testResults[testKey("Zabbix", source.id)] ? (
                                <div
                                  className={clsx(
                                    "mt-3 rounded-xl border px-3 py-2 text-xs",
                                    testResults[testKey("Zabbix", source.id)].status === "error"
                                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                                      : "border-border bg-base/50 text-muted"
                                  )}
                                >
                                  <p className="font-semibold">
                                    {testResults[testKey("Zabbix", source.id)].message}
                                  </p>
                                  {testResults[testKey("Zabbix", source.id)].sampleLine ? (
                                    <p className="mt-1 font-mono text-muted">
                                      Sample: {testResults[testKey("Zabbix", source.id)].sampleLine}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-base/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Uptime Kuma</h3>
                        <p className="text-xs text-muted">Track multiple Kuma instances.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsDraft((prev) => ({
                            ...prev,
                            kumaSources: [...prev.kumaSources, createKumaSource()]
                          }))
                        }
                        disabled={!canEditSettings}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      >
                        Add
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      {settingsDraft.kumaSources.length === 0 ? (
                        <p className="text-sm text-muted">No Kuma sources added yet.</p>
                      ) : (
                        settingsDraft.kumaSources.map((source) => {
                          const isMissingLabel = Boolean(source.baseUrl) && !source.name.trim();
                          return (
                            <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <input
                                  value={source.name}
                                  onChange={(event) =>
                                    updateKumaSource(source.id, { name: event.target.value })
                                  }
                                  placeholder="Label (required)"
                                  disabled={!canEditSettings}
                                  className={clsx(
                                    "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                                    isMissingLabel ? "border-red-500" : "border-border"
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => testSource("Kuma", source)}
                                    disabled={
                                      !canEditSettings ||
                                      !source.baseUrl ||
                                      (source.mode === "status" && !source.slug)
                                    }
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                                  >
                                    Test
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSettingsDraft((prev) => ({
                                        ...prev,
                                        kumaSources: prev.kumaSources.filter(
                                          (entry) => entry.id !== source.id
                                        )
                                      }))
                                    }
                                    disabled={!canEditSettings}
                                    className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <input
                                  value={source.baseUrl}
                                  onChange={(event) =>
                                    updateKumaSource(source.id, { baseUrl: event.target.value })
                                  }
                                  placeholder="https://kuma.example.com"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                                <select
                                  value={source.mode}
                                  onChange={(event) =>
                                    updateKumaSource(source.id, {
                                      mode: event.target.value as KumaSource["mode"]
                                    })
                                  }
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                >
                                  <option value="status">Status page</option>
                                  <option value="apiKey">API key</option>
                                </select>
                                <input
                                  value={source.slug}
                                  onChange={(event) =>
                                    updateKumaSource(source.id, { slug: event.target.value })
                                  }
                                  placeholder="Status page slug"
                                  disabled={!canEditSettings || source.mode !== "status"}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                                <input
                                  value={source.key}
                                  onChange={(event) =>
                                    updateKumaSource(source.id, { key: event.target.value })
                                  }
                                  placeholder="API key"
                                  disabled={!canEditSettings}
                                  className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                                />
                              </div>
                              {testResults[testKey("Kuma", source.id)] ? (
                                <div
                                  className={clsx(
                                    "mt-3 rounded-xl border px-3 py-2 text-xs",
                                    testResults[testKey("Kuma", source.id)].status === "error"
                                      ? "border-red-500/40 bg-red-500/10 text-red-500"
                                      : "border-border bg-base/50 text-muted"
                                  )}
                                >
                                  <p className="font-semibold">
                                    {testResults[testKey("Kuma", source.id)].message}
                                  </p>
                                  {testResults[testKey("Kuma", source.id)].sampleLine ? (
                                    <p className="mt-1 font-mono text-muted">
                                      Sample: {testResults[testKey("Kuma", source.id)].sampleLine}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-base/40 p-4">
                    <h3 className="text-lg font-semibold">Auto Refresh</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        value={settingsDraft.refreshInterval}
                        onChange={(event) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            refreshInterval: Number(event.target.value)
                          })
                        }
                        disabled={!canEditSettings}
                        className="w-32 rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                      />
                      <span className="text-sm text-muted">seconds (min 5)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-surface/90 p-6 text-sm text-muted shadow-card backdrop-blur">
                <p className="uppercase tracking-[0.3em]">Endpoint Notes</p>
                <ul className="mt-3 space-y-2">
                  <li>Prometheus and Zabbix URLs auto-append their API endpoints.</li>
                  <li>Kuma status page uses `/api/status-page/slug` with optional API key.</li>
                  <li>Kuma API key mode uses `/api/monitors` for down checks.</li>
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "appearance" ? (
          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Appearance</p>
                    <h2 className="text-2xl font-semibold">Theme palette</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          appearance: defaultAppearance
                        }))
                      }
                      disabled={!canEditSettings}
                      className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={saveSettings}
                      disabled={!canEditSettings}
                      className={clsx(
                        "rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]",
                        canEditSettings ? "bg-accent text-white" : "border border-border text-muted"
                      )}
                    >
                      Save
                    </button>
                  </div>
                </div>
                {settingsStatus ? <p className="mt-3 text-sm text-muted">{settingsStatus}</p> : null}
                {!isAdmin ? (
                  <p className="mt-3 text-sm text-muted">
                    Only admins can update the global appearance palette.
                  </p>
                ) : null}

                <div className="mt-6 space-y-6">
                  <div className="rounded-2xl border border-border bg-base/40 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">Branding</h3>
                        <p className="text-xs text-muted">
                          Upload a logo and favicon to customize the shell.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateBranding("logoUrl", "");
                          updateBranding("faviconUrl", "");
                        }}
                        disabled={!canEditSettings}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-surface/80 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Logo</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-border bg-base/60">
                            {settingsDraft.appearance.branding.logoUrl ? (
                              <img
                                src={settingsDraft.appearance.branding.logoUrl}
                                alt="Logo preview"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-muted">None</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              disabled={!canEditSettings}
                              onChange={(event) =>
                                handleAssetUpload(event.target.files?.[0] ?? null, (value) =>
                                  updateBranding("logoUrl", value)
                                )
                              }
                              className="w-full text-xs text-muted"
                            />
                            <input
                              value={settingsDraft.appearance.branding.logoUrl}
                              onChange={(event) => updateBranding("logoUrl", event.target.value)}
                              disabled={!canEditSettings}
                              placeholder="Paste logo URL or data URI"
                              className="w-full rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface/80 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">Favicon</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-border bg-base/60">
                            {settingsDraft.appearance.branding.faviconUrl ? (
                              <img
                                src={settingsDraft.appearance.branding.faviconUrl}
                                alt="Favicon preview"
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <span className="text-xs text-muted">None</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/png,image/x-icon,image/svg+xml"
                              disabled={!canEditSettings}
                              onChange={(event) =>
                                handleAssetUpload(event.target.files?.[0] ?? null, (value) =>
                                  updateBranding("faviconUrl", value)
                                )
                              }
                              className="w-full text-xs text-muted"
                            />
                            <input
                              value={settingsDraft.appearance.branding.faviconUrl}
                              onChange={(event) =>
                                updateBranding("faviconUrl", event.target.value)
                              }
                              disabled={!canEditSettings}
                              placeholder="Paste favicon URL or data URI"
                              className="w-full rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-base/40 p-5">
                    <div>
                      <h3 className="text-lg font-semibold">Background patterns</h3>
                      <p className="text-xs text-muted">
                        Adjust gradient, glow, and grain intensity.
                      </p>
                    </div>
                    <div className="mt-4 space-y-4">
                      {([
                        { key: "gradient", label: "Gradient" },
                        { key: "glow", label: "Glow" },
                        { key: "noise", label: "Grain" }
                      ] as Array<{ key: "gradient" | "glow" | "noise"; label: string }>).map(
                        (item) => (
                        <label key={item.key} className="space-y-2 text-sm">
                          <span className="text-xs uppercase tracking-[0.2em] text-muted">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={settingsDraft.appearance.background[item.key]}
                              onChange={(event) =>
                                updateBackground(item.key, Number(event.target.value))
                              }
                              disabled={!canEditSettings}
                              className="w-full"
                            />
                            <span className="w-10 text-xs text-muted">
                              {settingsDraft.appearance.background[item.key]}%
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {(["light", "dark"] as Array<"light" | "dark">).map((mode) => (
                    <div key={mode} className="rounded-2xl border border-border bg-base/40 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {mode === "light" ? "Light theme" : "Dark theme"}
                          </h3>
                          <p className="text-xs text-muted">
                            {mode === "light"
                              ? "Applies when light mode is selected."
                              : "Applies when dark mode is selected."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {appearanceFields.map((field) => (
                          <label key={`${mode}-${field.key}`} className="space-y-2 text-sm">
                            <span className="text-xs uppercase tracking-[0.2em] text-muted">
                              {field.label}
                            </span>
                            <div className="flex items-center gap-3">
                              <input
                                type="color"
                                value={settingsDraft.appearance[mode][field.key]}
                                onChange={(event) =>
                                  updateAppearance(mode, field.key, event.target.value)
                                }
                                disabled={!canEditSettings}
                                className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-base/60 p-1"
                              />
                              <input
                                value={settingsDraft.appearance[mode][field.key]}
                                onChange={(event) =>
                                  updateAppearance(mode, field.key, event.target.value)
                                }
                                disabled={!canEditSettings}
                                className="flex-1 rounded-xl border border-border bg-base/60 px-3 py-2 text-sm"
                              />
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Live Preview</p>
                    <h3 className="mt-2 text-lg font-semibold">Dashboard tiles</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                    >
                      Dark
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-border bg-surface/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Accent</p>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-accent" />
                      <span className="text-sm text-muted">Primary action color</span>
                    </div>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-xl bg-accent py-2 text-xs uppercase tracking-[0.2em] text-white"
                    >
                      Example Button
                    </button>
                  </div>
                  <div className="rounded-2xl border border-border bg-base/50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Surface</p>
                    <p className="mt-2 text-sm text-muted">
                      Background, cards, and text use the palette you set.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "audit" ? (
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Audit Log</p>
                  <h2 className="text-2xl font-semibold">System activity</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAuditLogs()}
                  className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
                >
                  Refresh
                </button>
              </div>
              {auditStatus ? <p className="mt-3 text-sm text-muted">{auditStatus}</p> : null}
              {isLoadingAudit ? (
                <p className="mt-4 text-sm text-muted">Loading audit log...</p>
              ) : auditLogs.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No activity recorded yet.</p>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-base/60 text-xs uppercase tracking-[0.2em] text-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Action</th>
                        <th className="px-4 py-3 text-left">Actor</th>
                        <th className="px-4 py-3 text-left">Details</th>
                        <th className="px-4 py-3 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t border-border bg-base/40">
                          <td className="px-4 py-3 font-semibold">{log.action}</td>
                          <td className="px-4 py-3 text-muted">
                            {log.userName ?? "System"}
                            {log.userEmail ? ` (${log.userEmail})` : ""}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted">
                            <pre className="whitespace-pre-wrap font-sans">
                              {formatAuditDetails(log.details)}
                            </pre>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "users" ? (
          <section className="mt-8 space-y-6">
            <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Profile</p>
              <h2 className="text-2xl font-semibold">Account Settings</h2>
              {profileStatus ? <p className="mt-3 text-sm text-muted">{profileStatus}</p> : null}
              <div className="mt-4 space-y-3">
                <input
                  value={profileDraft.firstName}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, firstName: event.target.value })
                  }
                  placeholder="First name"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <input
                  value={profileDraft.lastName}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, lastName: event.target.value })
                  }
                  placeholder="Last name"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <input
                  value={profileDraft.username}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, username: event.target.value })
                  }
                  placeholder="Username"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <input
                  value={profileDraft.email}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, email: event.target.value })
                  }
                  placeholder="Email"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <input
                  value={profileDraft.avatarUrl}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, avatarUrl: event.target.value })
                  }
                  placeholder="Avatar URL"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <input
                  type="password"
                  value={profileDraft.password}
                  onChange={(event) =>
                    setProfileDraft({ ...profileDraft, password: event.target.value })
                  }
                  placeholder="New password"
                  className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={saveProfile}
                  className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-white"
                >
                  Update Profile
                </button>
              </div>
            </div>

            {!isAdmin ? (
              <div className="rounded-3xl border border-border bg-surface/90 p-8 text-sm text-muted shadow-card">
                Only administrators can manage users.
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted">Users</p>
                  <h2 className="text-2xl font-semibold">Manage Accounts</h2>
                  {userStatus ? <p className="mt-3 text-sm text-muted">{userStatus}</p> : null}
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <input
                      value={newUser.firstName}
                      onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })}
                      placeholder="First name"
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    />
                    <input
                      value={newUser.lastName}
                      onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })}
                      placeholder="Last name"
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    />
                    <input
                      value={newUser.username}
                      onChange={(event) => setNewUser({ ...newUser, username: event.target.value })}
                      placeholder="Username"
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    />
                    <input
                      value={newUser.email}
                      onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                      placeholder="Email"
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    />
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                      placeholder="Password"
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    />
                    <select
                      value={newUser.role}
                      onChange={(event) =>
                        setNewUser({ ...newUser, role: event.target.value as "viewer" | "admin" })
                      }
                      className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={createNewUser}
                    className="mt-4 rounded-full bg-accent px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
                  >
                    Create User
                  </button>
                </div>

                <div className="rounded-3xl border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                  <h3 className="text-lg font-semibold">Existing Users</h3>
                  <div className="mt-4 space-y-3">
                    {users.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-base/40 px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold">
                            {entry.firstName} {entry.lastName}
                          </p>
                          <p className="text-xs text-muted">
                            {entry.username} - {entry.email}
                          </p>
                        </div>
                        <select
                          value={entry.role}
                          onChange={(event) =>
                            updateUserRole(entry.id, event.target.value as "viewer" | "admin")
                          }
                          className="rounded-full border border-border bg-base/60 px-3 py-1 text-xs"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}
        </main>
      </div>
    </div>
  );
}
