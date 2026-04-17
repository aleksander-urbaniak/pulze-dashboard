import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleUser,
  faKey,
  faShieldHalved,
  faUserPen,
  faXmark
} from "@fortawesome/free-solid-svg-icons";

import {
  settingsFieldClass,
  settingsLabelClass,
  settingsMutedButton,
  settingsPanelCard,
  settingsPrimaryButton
} from "./theme";

type ProfileDraft = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string;
  password: string;
};

type ProfileEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  profileDraft: ProfileDraft;
  setProfileDraft: React.Dispatch<React.SetStateAction<ProfileDraft>>;
  profileStatus: string | null;
  onSaveProfile: () => void;
  twoFactorEnabled: boolean;
  twoFactorStatus: string | null;
  twoFactorCode: string;
  setTwoFactorCode: React.Dispatch<React.SetStateAction<string>>;
  twoFactorSetupSecret: string | null;
  onStartTwoFactorSetup: () => void;
  onConfirmTwoFactorSetup: () => void;
  onDisableTwoFactor: () => void;
};

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className={settingsLabelClass}>{label}</span>
      {children}
    </label>
  );
}

export default function ProfileEditorModal({
  isOpen,
  onClose,
  profileDraft,
  setProfileDraft,
  profileStatus,
  onSaveProfile,
  twoFactorEnabled,
  twoFactorStatus,
  twoFactorCode,
  setTwoFactorCode,
  twoFactorSetupSecret,
  onStartTwoFactorSetup,
  onConfirmTwoFactorSetup,
  onDisableTwoFactor
}: ProfileEditorModalProps) {
  const defaultTwoFactorHint = "Add the key to your authenticator app, then enter a code.";
  const [isTwoFactorPopupOpen, setIsTwoFactorPopupOpen] = useState(false);
  const [isPasswordPopupOpen, setIsPasswordPopupOpen] = useState(false);
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [passwordPopupStatus, setPasswordPopupStatus] = useState<string | null>(null);
  const [manualKeyCopied, setManualKeyCopied] = useState(false);
  const previousTwoFactorEnabledRef = useRef(twoFactorEnabled);

  useEffect(() => {
    if (!isOpen) {
      setIsTwoFactorPopupOpen(false);
      setIsPasswordPopupOpen(false);
      setNewPasswordDraft("");
      setConfirmPasswordDraft("");
      setPasswordPopupStatus(null);
      setManualKeyCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const previous = previousTwoFactorEnabledRef.current;
    if (isTwoFactorPopupOpen && !previous && twoFactorEnabled) {
      setIsTwoFactorPopupOpen(false);
      setTwoFactorCode("");
      setManualKeyCopied(false);
    }
    previousTwoFactorEnabledRef.current = twoFactorEnabled;
  }, [isTwoFactorPopupOpen, setTwoFactorCode, twoFactorEnabled]);

  const otpUri = useMemo(() => {
    if (!twoFactorSetupSecret) {
      return null;
    }
    const account = profileDraft.email.trim() || profileDraft.username.trim() || "account";
    return `otpauth://totp/Pulze:${encodeURIComponent(account)}?secret=${encodeURIComponent(
      twoFactorSetupSecret
    )}&issuer=Pulze`;
  }, [profileDraft.email, profileDraft.username, twoFactorSetupSecret]);

  const openTwoFactorPopup = () => {
    setIsTwoFactorPopupOpen(true);
    setManualKeyCopied(false);
    if (!twoFactorEnabled && !twoFactorSetupSecret) {
      onStartTwoFactorSetup();
    }
  };

  const copyManualKey = async () => {
    if (!twoFactorSetupSecret || typeof navigator === "undefined") {
      return;
    }
    try {
      await navigator.clipboard.writeText(twoFactorSetupSecret);
      setManualKeyCopied(true);
      window.setTimeout(() => setManualKeyCopied(false), 1200);
    } catch {
      setManualKeyCopied(false);
    }
  };

  const submitPasswordChange = () => {
    setPasswordPopupStatus(null);
    if (newPasswordDraft.trim().length < 8) {
      setPasswordPopupStatus("Password should be at least 8 characters.");
      return;
    }
    if (newPasswordDraft !== confirmPasswordDraft) {
      setPasswordPopupStatus("Passwords do not match.");
      return;
    }
    setProfileDraft((prev) => ({ ...prev, password: newPasswordDraft }));
    onSaveProfile();
    setNewPasswordDraft("");
    setConfirmPasswordDraft("");
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile editor"
        className="absolute inset-0 bg-[#030916]/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="glass-shell relative z-[101] flex h-[min(84vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faCircleUser} className="h-5 w-5 text-text" />
            <h3 className="text-[2rem] font-semibold leading-none text-text">Account</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-field flex h-9 w-9 items-center justify-center rounded-full border text-muted transition hover:border-accent/35 hover:text-accent"
            aria-label="Close profile editor"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <section className={clsx(settingsPanelCard, "space-y-4 p-4")}>
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faUserPen} className="h-4 w-4 text-text" />
              <h4 className="text-2xl font-semibold leading-none text-text">Account name</h4>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="First name">
                <input
                  value={profileDraft.firstName}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  className={settingsFieldClass}
                />
              </Field>
              <Field label="Last name">
                <input
                  value={profileDraft.lastName}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  className={settingsFieldClass}
                />
              </Field>
              <Field label="Username">
                <input
                  value={profileDraft.username}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className={settingsFieldClass}
                />
              </Field>
              <Field label="Email address">
                <input
                  value={profileDraft.email}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className={settingsFieldClass}
                />
              </Field>
              <Field label="Avatar URL">
                <input
                  value={profileDraft.avatarUrl}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, avatarUrl: event.target.value }))
                  }
                  className={settingsFieldClass}
                />
              </Field>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={onSaveProfile} className={settingsPrimaryButton}>
                Save Account
              </button>
            </div>
          </section>

          <section className={clsx(settingsPanelCard, "space-y-3 p-4")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-text" />
                <h4 className="text-2xl font-semibold leading-none text-text">
                  Two-factor authentication
                </h4>
                <span
                  className={clsx(
                    "rounded-lg px-2.5 py-1 text-xs font-bold",
                    twoFactorEnabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-base/70 text-muted"
                  )}
                >
                  {twoFactorEnabled ? "Active" : "Inactive"}
                </span>
              </div>
              <button type="button" onClick={openTwoFactorPopup} className={settingsMutedButton}>
                {twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
              </button>
            </div>

            <p className="text-sm text-muted">
              Add an extra layer of security by enabling two-factor authentication.
            </p>
            {twoFactorStatus ? <p className="text-xs text-muted">{twoFactorStatus}</p> : null}
          </section>

          <section className={clsx(settingsPanelCard, "space-y-3 p-4")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faKey} className="h-4 w-4 text-text" />
                <h4 className="text-2xl font-semibold leading-none text-text">Change password</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordPopupOpen(true)}
                className={settingsMutedButton}
              >
                Change Password
              </button>
            </div>
            <p className="text-sm text-muted">
              Choose a new and secure password for your account here.
            </p>
          </section>

          {profileStatus ? <p className="text-sm text-muted">{profileStatus}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className={settingsMutedButton}>
            Close
          </button>
          <button type="button" onClick={onSaveProfile} className={settingsPrimaryButton}>
            Save Changes
          </button>
        </div>

        {isTwoFactorPopupOpen ? (
          <div className="absolute inset-0 z-[130] flex items-center justify-center bg-[#020a16]/65 p-4 backdrop-blur-sm">
            <div className="glass-shell w-full max-w-lg max-h-[68vh] overflow-y-auto rounded-xl border p-3 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.95)]">
              <div className="flex items-start justify-between gap-3">
                <h5 className="text-xl font-semibold text-text">
                  {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </h5>
                <button
                  type="button"
                  onClick={() => {
                    setManualKeyCopied(false);
                    setIsTwoFactorPopupOpen(false);
                  }}
                  className="glass-field flex h-9 w-9 items-center justify-center rounded-xl border text-muted transition hover:border-accent/35 hover:text-accent"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              </div>

              {twoFactorEnabled ? (
                <div className="mt-2.5 space-y-2.5">
                  <p className="text-sm text-text">
                    Enter your 2FA code to disable two-factor authentication.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value)}
                      placeholder="Enter 2FA code"
                      className={clsx(settingsFieldClass, "h-11 min-w-[220px] flex-1")}
                    />
                    <button
                      type="button"
                      onClick={onDisableTwoFactor}
                      disabled={!twoFactorCode.trim()}
                      className={clsx(settingsPrimaryButton, "h-11 px-5 disabled:opacity-60")}
                    >
                      Disable
                    </button>
                  </div>
                  {twoFactorStatus ? <p className="text-sm text-muted">{twoFactorStatus}</p> : null}
                </div>
              ) : (
                <div className="mt-2.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-semibold text-indigo-200">
                      1
                    </span>
                    <p className="text-base font-semibold uppercase tracking-[0.08em] text-text">Scan QR Code</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[130px_minmax(0,1fr)]">
                    {twoFactorSetupSecret && otpUri ? (
                      <div className="w-fit overflow-hidden rounded-xl border border-white/20 bg-white p-2">
                        <Image
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpUri)}`}
                          alt="2FA QR Code"
                          width={108}
                          height={108}
                          unoptimized
                          className="h-[108px] w-[108px]"
                        />
                      </div>
                    ) : null}
                    <p className="max-w-md text-sm leading-relaxed text-text">
                      Open your authenticator app and scan this image to link your account instantly.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
                        2
                      </span>
                      <p className="text-base font-semibold uppercase tracking-[0.08em] text-text">Manual Entry</p>
                    </div>
                    <span className="rounded-full bg-base/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Optional
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-base/60 p-3">
                    <p className="mb-2 text-xs text-muted">
                      Use this key if you&apos;re unable to scan the QR code.
                    </p>
                    <div className="glass-field flex flex-wrap items-center gap-2 rounded-xl border p-2">
                        <p className="min-w-0 flex-1 break-all font-mono text-[13px] text-accent">
                          {twoFactorSetupSecret ?? "Loading key..."}
                        </p>
                      <button
                        type="button"
                        onClick={copyManualKey}
                        className={clsx(settingsMutedButton, "px-3 py-1.5 text-[10px]")}
                      >
                        {manualKeyCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-semibold text-indigo-200">
                      3
                    </span>
                      <p className="text-base font-semibold uppercase tracking-[0.08em] text-text">Verify Code</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value)}
                      placeholder="000 000"
                      className={clsx(settingsFieldClass, "h-11 min-w-[220px] flex-1")}
                    />
                    <button
                      type="button"
                      onClick={onConfirmTwoFactorSetup}
                      disabled={!twoFactorCode.trim()}
                      className={clsx(settingsPrimaryButton, "h-11 px-5 disabled:opacity-60")}
                    >
                      Enable
                    </button>
                  </div>

                  {twoFactorStatus && twoFactorStatus !== defaultTwoFactorHint ? (
                    <p className="text-sm text-muted">{twoFactorStatus}</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {isPasswordPopupOpen ? (
          <div className="absolute inset-0 z-[130] flex items-center justify-center bg-[#020a16]/65 p-4 backdrop-blur-sm">
            <div className="glass-shell w-full max-w-lg rounded-xl border p-4 shadow-[0_24px_50px_-28px_rgba(0,0,0,0.95)]">
              <div className="flex items-start justify-between gap-3">
                <h5 className="text-4xl font-semibold text-text">Change password</h5>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordPopupOpen(false);
                    setPasswordPopupStatus(null);
                    setNewPasswordDraft("");
                    setConfirmPasswordDraft("");
                  }}
                  className="glass-field flex h-9 w-9 items-center justify-center rounded-xl border text-muted transition hover:border-accent/35 hover:text-accent"
                >
                  <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-2xl font-medium leading-tight text-text">
                A strong password contains special characters, numbers, and letters in both uppercase
                and lowercase.
              </p>

              <div className="mt-4 space-y-3">
                <input
                  type="password"
                  value={newPasswordDraft}
                  onChange={(event) => setNewPasswordDraft(event.target.value)}
                  placeholder="New password"
                  className={clsx(settingsFieldClass, "h-12")}
                />
                <input
                  type="password"
                  value={confirmPasswordDraft}
                  onChange={(event) => setConfirmPasswordDraft(event.target.value)}
                  placeholder="Confirm new password"
                  className={clsx(settingsFieldClass, "h-12")}
                />
              </div>

              {passwordPopupStatus ? (
                <p className="mt-3 text-sm text-rose-300">{passwordPopupStatus}</p>
              ) : null}
              {profileStatus ? <p className="mt-2 text-sm text-muted">{profileStatus}</p> : null}

              <button
                type="button"
                onClick={submitPasswordChange}
                className="mt-4 h-12 w-full rounded-xl bg-accent text-lg font-semibold text-on-accent transition hover:brightness-110"
              >
                Change password
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
