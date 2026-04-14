"use client";

import { useEffect, useState } from "react";
import { AppSessionContext } from "../lib/app-session";
import type { Settings, User } from "../lib/types";
import AuthScreen from "../app/home/components/AuthScreen";
import Sidebar from "./Sidebar";
import type { UserResponse, BootstrapResponse, SettingsResponse } from "../app/home/types";
import { defaultAppearance } from "../lib/appearance";
import ProfileEditorModal from "../app/settings/components/ProfileEditorModal";

const emptySettings: Settings = {
  prometheusSources: [],
  zabbixSources: [],
  kumaSources: [],
  refreshInterval: 30,
  appearance: defaultAppearance
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginTotpCode, setLoginTotpCode] = useState("");
  const [loginChallengeToken, setLoginChallengeToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [ssoProviders, setSsoProviders] = useState<{ saml: boolean; samlProviderName: string }>({
    saml: false,
    samlProviderName: "SAML SSO"
  });
  const [setupForm, setSetupForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    avatarUrl: "",
    password: ""
  });
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
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

  useEffect(() => {
    void loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      void loadSettings();
      setProfileDraft({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl ?? "",
        password: ""
      });
    }
  }, [user]);

  async function checkSetup() {
    const response = await fetch("/api/auth/bootstrap");
    if (!response.ok) {
      setNeedsSetup(false);
      return;
    }
    const data = (await response.json()) as BootstrapResponse;
    setNeedsSetup(Boolean(data.needsSetup));
  }

  async function loadSession() {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setUser(null);
      await checkSetup();
      await loadSsoProviders();
      setIsCheckingSetup(false);
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setIsCheckingSetup(false);
  }

  async function loadSsoProviders() {
    const response = await fetch("/api/auth/sso/providers");
    if (!response.ok) {
      setSsoProviders({ saml: false, samlProviderName: "SAML SSO" });
      return;
    }
    const data = (await response.json()) as { saml?: boolean; samlProviderName?: string };
    setSsoProviders({
      saml: Boolean(data.saml),
      samlProviderName: data.samlProviderName?.trim() || "SAML SSO"
    });
  }

  async function loadSettings() {
    const response = await fetch("/api/settings");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as SettingsResponse;
    setSettings(data.settings);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);
    const payload = loginChallengeToken
      ? {
          challengeToken: loginChallengeToken,
          totpCode: loginTotpCode
        }
      : loginForm;
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      setLoginError(data.error ?? "Login failed");
      return;
    }
    if (data.requiresTwoFactor && data.challengeToken) {
      setLoginChallengeToken(data.challengeToken);
      setLoginTotpCode("");
      setLoginError(null);
      return;
    }
    setUser((data as UserResponse).user);
    setNeedsSetup(false);
    setLoginForm({ username: "", password: "" });
    setLoginChallengeToken(null);
    setLoginTotpCode("");
  }

  async function handleSetup(event: React.FormEvent) {
    event.preventDefault();
    setSetupError(null);
    const response = await fetch("/api/auth/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(setupForm)
    });
    if (!response.ok) {
      const data = await response.json();
      setSetupError(data.error ?? "Setup failed");
      return;
    }
    const data = (await response.json()) as UserResponse;
    setUser(data.user);
    setNeedsSetup(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setNeedsSetup(false);
    setIsCheckingSetup(true);
    setLoginChallengeToken(null);
    setLoginTotpCode("");
    await checkSetup();
    await loadSsoProviders();
    setIsCheckingSetup(false);
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
    setProfileStatus("Profile updated.");
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

  if (!user) {
    return (
      <AuthScreen
        needsSetup={needsSetup}
        isCheckingSetup={isCheckingSetup}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        loginTotpCode={loginTotpCode}
        setLoginTotpCode={setLoginTotpCode}
        isTwoFactorStep={Boolean(loginChallengeToken)}
        onCancelTwoFactor={() => {
          setLoginChallengeToken(null);
          setLoginTotpCode("");
          setLoginError(null);
        }}
        setupForm={setupForm}
        setSetupForm={setSetupForm}
        loginError={loginError}
        setupError={setupError}
        ssoProviders={ssoProviders}
        onLoginSubmit={handleLogin}
        onSetupSubmit={handleSetup}
      />
    );
  }

  return (
    <AppSessionContext.Provider value={{ user, settings }}>
      <div className="min-h-screen flex flex-col md:flex-row">
        <Sidebar onLogout={handleLogout} onOpenProfileEditor={() => setIsProfileEditorOpen(true)} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <ProfileEditorModal
        isOpen={isProfileEditorOpen}
        onClose={() => setIsProfileEditorOpen(false)}
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
      />
    </AppSessionContext.Provider>
  );
}
