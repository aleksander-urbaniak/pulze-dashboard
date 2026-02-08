"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import Sidebar from "../../components/Sidebar";
import { applyAppearanceToDocument, defaultAppearance } from "../../lib/appearance";
import type {
  AuthProvidersSettings,
  KumaSource,
  PrometheusSource,
  Settings,
  SilenceRule,
  ThemePalette,
  User,
  UserRole,
  ZabbixSource
} from "../../lib/types";
import { hasPermission } from "../../lib/rbac";
import type { AuditLogEntry, TestState } from "./types";
import DataSourcesSection from "./components/DataSourcesSection";
import AppearanceSection from "./components/AppearanceSection";
import AuditSection from "./components/AuditSection";
import UsersSection from "./components/UsersSection";
import SilencesSection from "./components/SilencesSection";
import AuthProvidersSection from "./components/AuthProvidersSection";

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
type AuditLogResponse = { logs: AuditLogEntry[]; total: number };
type SilencesResponse = { silences: SilenceRule[] };
type AuthProvidersResponse = { settings: AuthProvidersSettings };
type TabKey = "data" | "silences" | "appearance" | "users" | "audit" | "access";

const defaultAuthProviders: AuthProvidersSettings = {
  oidc: {
    enabled: false,
    issuerUrl: "",
    authorizationEndpoint: "",
    tokenEndpoint: "",
    userinfoEndpoint: "",
    clientId: "",
    clientSecret: "",
    scopes: "openid profile email",
    usernameClaim: "preferred_username",
    emailClaim: "email",
    nameClaim: "name",
    autoProvision: true
  },
  saml: {
    enabled: false,
    entryPoint: "",
    issuer: "",
    cert: "",
    autoProvision: false
  }
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
  const [silences, setSilences] = useState<SilenceRule[]>([]);
  const [silenceStatus, setSilenceStatus] = useState<string | null>(null);
  const [silenceDraft, setSilenceDraft] = useState({
    name: "",
    sourceType: "Any" as "Any" | "Prometheus" | "Zabbix" | "Kuma",
    sourceId: "",
    sourceLabel: "",
    servicePattern: "",
    environmentPattern: "",
    alertNamePattern: "",
    instancePattern: "",
    severity: "Any" as "Any" | "critical" | "warning" | "info",
    startsAt: "",
    endsAt: "",
    enabled: true
  });
  const [authDraft, setAuthDraft] = useState<AuthProvidersSettings>(defaultAuthProviders);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatarUrl: "",
    password: ""
  });
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState<string | null>(null);
  const [twoFactorSetupSecret, setTwoFactorSetupSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [userUpdateStatus, setUserUpdateStatus] = useState<string | null>(null);
  const [userPasswordDrafts, setUserPasswordDrafts] = useState<Record<string, string>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestState>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [auditStatus, setAuditStatus] = useState<string | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "viewer" as UserRole
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      void loadSettings();
      if (hasPermission(user, "users.manage")) {
        void loadUsers();
      }
      if (hasPermission(user, "silences.read")) {
        void loadSilences();
      }
      if (hasPermission(user, "settings.write")) {
        void loadAuthProviders();
      }
    }
  }, [user]);

  const canViewSettings = useMemo(() => hasPermission(user, "settings.read"), [user]);
  const canManageSilences = useMemo(() => hasPermission(user, "silences.write"), [user]);
  const canReadSilences = useMemo(() => hasPermission(user, "silences.read"), [user]);
  const canManageUsers = useMemo(() => hasPermission(user, "users.manage"), [user]);
  const canReadAudit = useMemo(() => hasPermission(user, "audit.read"), [user]);
  const canConfigureAuth = useMemo(() => hasPermission(user, "settings.write"), [user]);
  const auditPageCount = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const settingsTabItems = useMemo(() => {
    const items: Array<{ value: TabKey; label: string }> = [{ value: "users", label: "Users" }];
    if (canViewSettings) {
      items.unshift({ value: "data", label: "Data Sources" });
      items.push({ value: "appearance", label: "Appearance" });
    }
    if (canReadSilences) {
      items.push({ value: "silences", label: "Silences" });
    }
    if (canReadAudit) {
      items.push({ value: "audit", label: "Audit Log" });
    }
    if (canConfigureAuth) {
      items.push({ value: "access", label: "Access" });
    }
    return items;
  }, [canConfigureAuth, canReadAudit, canReadSilences, canViewSettings]);

  useEffect(() => {
    if (settingsTabItems.length === 0) {
      return;
    }
    if (!settingsTabItems.some((entry) => entry.value === activeTab)) {
      setActiveTab(settingsTabItems[0].value);
    }
  }, [activeTab, settingsTabItems]);

  useEffect(() => {
    if (settingsDraft.appearance) {
      applyAppearanceToDocument(settingsDraft.appearance);
    }
  }, [settingsDraft.appearance]);

  useEffect(() => {
    if (activeTab === "audit" && canReadAudit) {
      setAuditPage(1);
    }
  }, [activeTab, canReadAudit]);

  useEffect(() => {
    if (activeTab === "audit" && canReadAudit) {
      void loadAuditLogs();
    }
  }, [activeTab, canReadAudit, auditPage, auditPageSize]);

  useEffect(() => {
    if (auditPage > auditPageCount) {
      setAuditPage(auditPageCount);
    }
  }, [auditPage, auditPageCount]);

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

  async function loadUsers(nextEditingId?: string | null) {
    if (!user || !hasPermission(user, "users.manage")) {
      return;
    }
    const response = await fetch("/api/users");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as UsersResponse;
    setUsers(data.users);
    setUserPasswordDrafts({});
    setUserUpdateStatus(null);
    setEditingUserId(nextEditingId ?? null);
  }

  async function loadAuditLogs() {
    if (!canReadAudit) {
      return;
    }
    setIsLoadingAudit(true);
    setAuditStatus(null);
    const response = await fetch(`/api/audit?page=${auditPage}&pageSize=${auditPageSize}`);
    if (!response.ok) {
      setIsLoadingAudit(false);
      setAuditStatus("Failed to load audit log.");
      return;
    }
    const data = (await response.json()) as AuditLogResponse;
    setAuditLogs(data.logs ?? []);
    setAuditTotal(data.total ?? 0);
    setIsLoadingAudit(false);
  }

  async function createNewUser() {
    if (!canManageUsers) {
      return;
    }
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

  function updateUserDraft(id: string, updates: Partial<User>) {
    setUsers((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)));
  }

  async function saveUserDetails(entry: User) {
    if (!canManageUsers) {
      return;
    }
    setUserUpdateStatus(null);
    const password = userPasswordDrafts[entry.id]?.trim();
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: entry.id,
        username: entry.username,
        firstName: entry.firstName,
        lastName: entry.lastName,
        email: entry.email,
        avatarUrl: entry.avatarUrl,
        role: entry.role,
        password: password || undefined
      })
    });
    if (!response.ok) {
      const data = await response.json();
      setUserUpdateStatus(data.error ?? "Failed to update user");
      return;
    }
    setUserUpdateStatus("User updated.");
    setUserPasswordDrafts((prev) => ({ ...prev, [entry.id]: "" }));
    await loadUsers(entry.id);
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

  function updateAppearance(mode: "light" | "dark", key: keyof ThemePalette, value: string) {
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

  async function loadSilences() {
    if (!canReadSilences) {
      return;
    }
    const response = await fetch("/api/silences");
    if (!response.ok) {
      setSilenceStatus("Failed to load silences.");
      return;
    }
    const data = (await response.json()) as SilencesResponse;
    setSilences(data.silences ?? []);
    setSilenceStatus(null);
  }

  async function createSilenceEntry() {
    if (!canManageSilences) {
      return;
    }
    const start = silenceDraft.startsAt || new Date().toISOString().slice(0, 16);
    const end =
      silenceDraft.endsAt ||
      new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);
    const response = await fetch("/api/silences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...silenceDraft,
        startsAt: start,
        endsAt: end
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setSilenceStatus(data.error ?? "Failed to create silence.");
      return;
    }
    setSilenceStatus("Silence created.");
    setSilenceDraft({
      name: "",
      sourceType: "Any",
      sourceId: "",
      sourceLabel: "",
      servicePattern: "",
      environmentPattern: "",
      alertNamePattern: "",
      instancePattern: "",
      severity: "Any",
      startsAt: "",
      endsAt: "",
      enabled: true
    });
    await loadSilences();
  }

  async function toggleSilenceState(silence: SilenceRule, enabled: boolean) {
    if (!canManageSilences) {
      return;
    }
    const response = await fetch("/api/silences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: silence.id, enabled })
    });
    const data = await response.json();
    if (!response.ok) {
      setSilenceStatus(data.error ?? "Failed to update silence.");
      return;
    }
    await loadSilences();
  }

  async function deleteSilenceEntry(id: string) {
    if (!canManageSilences) {
      return;
    }
    const response = await fetch("/api/silences", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await response.json();
    if (!response.ok) {
      setSilenceStatus(data.error ?? "Failed to delete silence.");
      return;
    }
    await loadSilences();
  }

  async function loadAuthProviders() {
    if (!canConfigureAuth) {
      return;
    }
    const response = await fetch("/api/settings/auth");
    if (!response.ok) {
      setAuthStatus("Failed to load auth providers.");
      return;
    }
    const data = (await response.json()) as AuthProvidersResponse;
    setAuthDraft(data.settings ?? defaultAuthProviders);
    setAuthStatus(null);
  }

  async function saveAuthProviders() {
    if (!canConfigureAuth) {
      return;
    }
    const response = await fetch("/api/settings/auth", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authDraft)
    });
    const data = await response.json();
    if (!response.ok) {
      setAuthStatus(data.error ?? "Failed to save auth providers.");
      return;
    }
    setAuthDraft(data.settings ?? defaultAuthProviders);
    setAuthStatus("Auth providers saved.");
  }

  async function startTwoFactorSetup() {
    setTwoFactorStatus(null);
    const response = await fetch("/api/auth/2fa/setup");
    const data = await response.json();
    if (!response.ok) {
      setTwoFactorStatus(data.error ?? "Failed to start 2FA setup.");
      return;
    }
    setTwoFactorSetupSecret(data.secret ?? null);
    setTwoFactorStatus("Add the key to your authenticator app, then enter a code.");
    setTwoFactorCode("");
  }

  async function confirmTwoFactorSetup() {
    const response = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: twoFactorCode })
    });
    const data = await response.json();
    if (!response.ok) {
      setTwoFactorStatus(data.error ?? "Failed to enable 2FA.");
      return;
    }
    setTwoFactorSetupSecret(null);
    setTwoFactorCode("");
    setTwoFactorStatus("Two-factor authentication enabled.");
    setUser(data.user);
  }

  async function disableTwoFactorForProfile() {
    const response = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: twoFactorCode })
    });
    const data = await response.json();
    if (!response.ok) {
      setTwoFactorStatus(data.error ?? "Failed to disable 2FA.");
      return;
    }
    setTwoFactorSetupSecret(null);
    setTwoFactorCode("");
    setTwoFactorStatus("Two-factor authentication disabled.");
    setUser(data.user);
  }

  const silenceSourceOptions = useMemo(
    () => [
      ...settingsDraft.prometheusSources.map((source) => ({
        id: source.id,
        type: "Prometheus" as const,
        label: source.name || source.url
      })),
      ...settingsDraft.zabbixSources.map((source) => ({
        id: source.id,
        type: "Zabbix" as const,
        label: source.name || source.url
      })),
      ...settingsDraft.kumaSources.map((source) => ({
        id: source.id,
        type: "Kuma" as const,
        label: source.name || source.baseUrl
      }))
    ],
    [settingsDraft.kumaSources, settingsDraft.prometheusSources, settingsDraft.zabbixSources]
  );

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-surface/90 px-4 py-3 text-sm text-muted shadow-card sm:px-6 sm:py-4">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        settingsTabs={{
          items: settingsTabItems,
          active: activeTab,
          onChange: (value) => setActiveTab(value as TabKey)
        }}
      />
      <div className="flex-1 min-w-0">
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
          {activeTab === "data" && canViewSettings ? (
            <DataSourcesSection
              settingsDraft={settingsDraft}
              setSettingsDraft={setSettingsDraft}
              canEditSettings={canEditSettings}
              hasInvalidLabels={hasInvalidLabels}
              settingsStatus={settingsStatus}
              testResults={testResults}
              onSave={saveSettings}
              createPrometheusSource={createPrometheusSource}
              createZabbixSource={createZabbixSource}
              createKumaSource={createKumaSource}
              updatePrometheusSource={updatePrometheusSource}
              updateZabbixSource={updateZabbixSource}
              updateKumaSource={updateKumaSource}
              testSource={testSource}
              testKey={testKey}
            />
          ) : null}

          {activeTab === "silences" && canReadSilences ? (
            <SilencesSection
              canEditSilences={canManageSilences}
              silences={silences}
              silenceStatus={silenceStatus}
              silenceDraft={silenceDraft}
              setSilenceDraft={setSilenceDraft}
              sourceOptions={silenceSourceOptions}
              onCreateSilence={createSilenceEntry}
              onToggleSilence={toggleSilenceState}
              onDeleteSilence={deleteSilenceEntry}
              onRefresh={() => void loadSilences()}
            />
          ) : null}

          {activeTab === "appearance" && canViewSettings ? (
            <AppearanceSection
              settingsDraft={settingsDraft}
              setSettingsDraft={setSettingsDraft}
              canEditSettings={canEditSettings}
              settingsStatus={settingsStatus}
              isAdmin={canConfigureAuth}
              onSave={saveSettings}
              onUpdateAppearance={updateAppearance}
              onUpdateBranding={updateBranding}
              onUpdateBackground={updateBackground}
              onAssetUpload={handleAssetUpload}
              onSetTheme={setTheme}
            />
          ) : null}

          {activeTab === "audit" && canReadAudit ? (
            <AuditSection
              auditLogs={auditLogs}
              auditStatus={auditStatus}
              isLoadingAudit={isLoadingAudit}
              auditTotal={auditTotal}
              auditPage={auditPage}
              auditPageSize={auditPageSize}
              auditPageCount={auditPageCount}
              onPageSizeChange={(value) => {
                setAuditPageSize(value);
                setAuditPage(1);
              }}
              onPrevPage={() => setAuditPage((prev) => Math.max(prev - 1, 1))}
              onNextPage={() =>
                setAuditPage((prev) => Math.min(prev + 1, auditPageCount))
              }
              onRefresh={() => void loadAuditLogs()}
              formatAuditDetails={formatAuditDetails}
            />
          ) : null}

          {activeTab === "access" && canConfigureAuth ? (
            <AuthProvidersSection
              authDraft={authDraft}
              setAuthDraft={setAuthDraft}
              authStatus={authStatus}
              onSave={saveAuthProviders}
            />
          ) : null}

          {activeTab === "users" ? (
            <UsersSection
              isAdmin={canManageUsers}
              profileDraft={profileDraft}
              setProfileDraft={setProfileDraft}
              profileStatus={profileStatus}
              onSaveProfile={saveProfile}
              twoFactorEnabled={Boolean(user.twoFactorEnabled)}
              twoFactorStatus={twoFactorStatus}
              twoFactorCode={twoFactorCode}
              setTwoFactorCode={setTwoFactorCode}
              twoFactorSetupSecret={twoFactorSetupSecret}
              onStartTwoFactorSetup={startTwoFactorSetup}
              onConfirmTwoFactorSetup={confirmTwoFactorSetup}
              onDisableTwoFactor={disableTwoFactorForProfile}
              newUser={newUser}
              setNewUser={setNewUser}
              onCreateUser={createNewUser}
              userStatus={userStatus}
              users={users}
              editingUserId={editingUserId}
              setEditingUserId={setEditingUserId}
              userUpdateStatus={userUpdateStatus}
              updateUserDraft={updateUserDraft}
              userPasswordDrafts={userPasswordDrafts}
              setUserPasswordDrafts={setUserPasswordDrafts}
              onSaveUserDetails={saveUserDetails}
              onResetUser={(id) => void loadUsers(id)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
