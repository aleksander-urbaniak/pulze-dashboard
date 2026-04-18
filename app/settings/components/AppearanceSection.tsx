import clsx from "clsx";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBrush } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

import PageSectionHeader from "../../../components/PageSectionHeader";
import { defaultAppearance } from "../../../lib/appearance";
import type { Settings } from "../../../lib/types";
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsMutedButton,
  settingsPanelCard,
  settingsShellCard,
  settingsPrimaryButton
} from "./theme";

type AppearanceSectionProps = {
  headerRight?: React.ReactNode;
  settingsDraft: Settings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<Settings>>;
  canEditSettings: boolean;
  settingsStatus: string | null;
  isAdmin: boolean;
  onSave: () => void;
  onUpdateAppearance: (mode: "light" | "dark", key: "accent" | "accentSoft", value: string) => void;
  onUpdateBranding: (key: "logoUrl" | "faviconUrl", value: string) => void;
  onUpdateBackground: (key: "gradient" | "glow" | "noise" | "radius", value: number) => void;
  onAssetUpload: (file: File | null, onChange: (value: string) => void) => void;
  onSetTheme: (theme: string) => void;
};

function mixHex(baseHex: string, targetHex: string, ratio: number) {
  const normalize = (value: string) => {
    const hex = value.replace("#", "");
    return hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  };
  const base = normalize(baseHex);
  const target = normalize(targetHex);
  const channels = [0, 2, 4].map((index) => {
    const a = parseInt(base.slice(index, index + 2), 16);
    const b = parseInt(target.slice(index, index + 2), 16);
    return Math.round(a + (b - a) * ratio)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("").toUpperCase()}`;
}

function getOnAccentTextColor(value: string) {
  const normalized = value.replace("#", "");
  const hex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.68 ? "#000000" : "#FFFFFF";
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={settingsLabelClass}>{label}</span>
        <span className="text-[11px] font-mono text-muted">
          {value}
          {suffix}
        </span>
      </div>
      <div className="glass-field radius-ui border px-3 py-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-accent"
          style={{ ["--range-percent" as string]: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </label>
  );
}

export default function AppearanceSection({
  headerRight,
  settingsDraft,
  setSettingsDraft,
  canEditSettings,
  settingsStatus,
  isAdmin,
  onSave,
  onUpdateAppearance,
  onUpdateBranding,
  onUpdateBackground,
  onAssetUpload,
  onSetTheme
}: AppearanceSectionProps) {
  const { resolvedTheme } = useTheme();
  const [isPreviewButtonHovered, setIsPreviewButtonHovered] = useState(false);
  const isDarkTheme = resolvedTheme !== "light";
  const palette = isDarkTheme ? settingsDraft.appearance.dark : settingsDraft.appearance.light;
  const radius = settingsDraft.appearance.background.radius;
  const appName = "Pulze Dashboard";
  const customUrl = "https://dashboard.pulze.io";
  const previewFrameBg = isDarkTheme
    ? mixHex(palette.base, "#000000", 0.42)
    : mixHex(palette.base, "#9fb6d0", 0.22);
  const previewCardBg = isDarkTheme
    ? mixHex(palette.surface, palette.base, 0.2)
    : mixHex(palette.surface, palette.base, 0.32);
  const previewBorder = mixHex(palette.border, isDarkTheme ? "#0a1424" : "#ffffff", isDarkTheme ? 0.2 : 0.15);
  const previewHeroBg = isDarkTheme
    ? `linear-gradient(135deg, ${mixHex(palette.accent, palette.base, 0.78)} 0%, ${mixHex(palette.surface, palette.base, 0.12)} 100%)`
    : `linear-gradient(135deg, ${mixHex(palette.accent, "#FFFFFF", 0.82)} 0%, ${mixHex(palette.surface, palette.base, 0.08)} 100%)`;
  const previewAccentGlow = `${palette.accent}2E`;
  const previewMutedBg = `${palette.muted}18`;
  const previewOnAccentText = getOnAccentTextColor(palette.accent);
  const previewHoverAccent = mixHex(palette.accent, "#000000", 0.16);

  function handleAccentChange(value: string) {
    onUpdateAppearance("dark", "accent", value);
    onUpdateAppearance("light", "accent", value);
    onUpdateAppearance("dark", "accentSoft", mixHex("#0A0C12", value, 0.24));
    onUpdateAppearance("light", "accentSoft", mixHex("#ECF4FA", value, 0.18));
  }

  return (
    <section className="space-y-4">
      <PageSectionHeader
        icon={faBrush}
        title="Appearance"
        subtitle="Tune branding, accent, and visual effects across the dashboard."
        right={headerRight}
      />

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <aside className={clsx(settingsShellCard, "custom-scrollbar p-5 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto")}>
        <div className="space-y-8">
          {settingsStatus ? <p className="text-sm text-muted">{settingsStatus}</p> : null}
          {!isAdmin ? <p className="text-sm text-muted">Only admins can update the global appearance.</p> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-text">Branding</h3>
            <label className="radius-panel glass-field block cursor-pointer border-2 border-dashed p-6 text-center transition hover:border-accent/45 hover:bg-accent/5">
              <div className="radius-pill mx-auto flex h-11 w-11 items-center justify-center bg-accent/20 text-on-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-text">Upload Workspace Logo</p>
              <p className="mt-1 text-xs text-muted">SVG or PNG, Max 2MB</p>
              <input
                type="file"
                accept="image/*"
                disabled={!canEditSettings}
                onChange={(event) =>
                  onAssetUpload(event.target.files?.[0] ?? null, (value) =>
                    onUpdateBranding("logoUrl", value)
                  )
                }
                className="hidden"
              />
            </label>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className={settingsLabelClass}>App Name</span>
                <input value={appName} readOnly className={settingsFieldClass} />
              </label>
              <label className="space-y-2">
                <span className={settingsLabelClass}>Custom URL</span>
                <input value={customUrl} readOnly className={settingsFieldClass} />
              </label>
              <div className="mt-2 flex flex-col items-start gap-2">
                <span className={settingsLabelClass}>Favicon</span>
                <label className={clsx("inline-flex w-fit cursor-pointer", settingsMutedButton)}>
                  Choose Favicon
                  <input
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    disabled={!canEditSettings}
                    onChange={(event) =>
                      onAssetUpload(event.target.files?.[0] ?? null, (value) =>
                        onUpdateBranding("faviconUrl", value)
                      )
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-text">Theme Engine</h3>
              <button
                type="button"
                onClick={() =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    appearance: defaultAppearance
                  }))
                }
                disabled={!canEditSettings}
                className={settingsMutedButton}
              >
                Reset
              </button>
            </div>

            <div className={clsx("space-y-6 p-4", settingsPanelCard)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className={settingsLabelClass}>Accent Color</span>
                  <div className="glass-field radius-ui flex items-center gap-2 border p-2">
                    <input
                      type="color"
                      value={palette.accent}
                      disabled={!canEditSettings}
                      onChange={(event) => handleAccentChange(event.target.value)}
                      className="h-9 w-9 rounded-lg border-0 bg-transparent p-0"
                    />
                    <span className="text-xs font-mono uppercase text-muted">{palette.accent}</span>
                  </div>
                </label>

                <div className="space-y-2">
                  <span className={settingsLabelClass}>Appearance</span>
                  <div className="glass-field radius-ui flex border p-1">
                    <button
                      type="button"
                      onClick={() => onSetTheme("dark")}
                      className={clsx(
                        "radius-ui flex-1 py-2 transition",
                        isDarkTheme
                          ? "selected-soft"
                          : "text-text hover:text-accent"
                      )}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mx-auto">
                        <path
                          d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTheme("light")}
                      className={clsx(
                        "radius-ui flex-1 py-2 transition",
                        !isDarkTheme
                          ? "selected-soft"
                          : "text-text hover:text-accent"
                      )}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mx-auto">
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
                        <path
                          d="M12 3v2M12 19v2M3 12h2M19 12h2M5.7 5.7l1.4 1.4M16.9 16.9l1.4 1.4M18.3 5.7l-1.4 1.4M7.1 16.9l-1.4 1.4"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Slider
                  label="Corner Radius"
                  value={radius}
                  min={0}
                  max={32}
                  suffix="px"
                  disabled={!canEditSettings}
                  onChange={(value) => onUpdateBackground("radius", value)}
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!canEditSettings}
                  className={settingsPrimaryButton}
                >
                  Save Theme
                </button>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <section className={clsx(settingsShellCard, "relative flex min-h-[640px] items-center justify-center overflow-hidden p-10")}>
        <div className="absolute left-8 top-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Live Preview
        </div>

        <div className="relative w-full max-w-[360px]">
          <div
            className="mx-auto aspect-[9/19] w-full rounded-[42px] p-3 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.55)]"
            style={{ backgroundColor: previewFrameBg }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[34px] border"
              style={{
                borderColor: previewBorder,
                backgroundColor: palette.base,
                borderRadius: `calc(18px + ${radius * 0.5}px)`
              }}
            >
              <div className="flex items-center justify-between px-5 pb-3 pt-5">
                <span className="text-[10px] font-bold" style={{ color: palette.muted }}>9:41</span>
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: palette.muted }} />
                  <span className="h-2.5 w-3.5 rounded-sm border" style={{ borderColor: palette.muted }} />
                </div>
              </div>

              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center text-sm font-bold"
                    style={{
                      borderRadius: `calc(8px + ${radius * 0.25}px)`,
                      backgroundColor: previewMutedBg,
                      color: palette.text
                    }}
                  >
                    P
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full border"
                    style={{ borderColor: palette.muted, backgroundColor: `${palette.muted}20` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accent }} />
                  </div>
                </div>

                <div
                  className="mt-5 overflow-hidden border p-4"
                  style={{
                    borderColor: previewBorder,
                    borderRadius: `calc(14px + ${radius * 0.45}px)`,
                    background: previewHeroBg,
                    boxShadow: `0 18px 34px -24px ${previewAccentGlow}`
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: palette.muted }}>
                      Workspace Health
                    </p>
                    <div
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ backgroundColor: `${palette.surface}B8`, color: palette.text }}
                    >
                      Stable
                    </div>
                  </div>

                  <div className="mt-3 w-full text-center">
                    <h4 className="text-xl font-bold" style={{ color: palette.text }}>{appName}</h4>
                  </div>

                  <p className="mt-3 text-center text-[11px]" style={{ color: palette.muted }}>
                    {customUrl}
                  </p>

                  <div className="mt-4 flex items-end justify-center gap-2">
                    {[42, 70, 54, 86, 62, 78].map((height, index) => (
                      <span
                        key={height}
                        className="w-4 rounded-full"
                        style={{
                          height: `${height * 0.46}px`,
                          backgroundColor: index === 3 ? palette.accent : `${palette.text}22`
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div
                    className="border p-4"
                    style={{
                      borderColor: previewBorder,
                      borderRadius: `calc(10px + ${radius * 0.4}px)`,
                      backgroundColor: previewCardBg
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${palette.accent}26` }}
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.accent }} />
                        </span>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: palette.text }}>Active Alerts</p>
                          <p className="text-[10px]" style={{ color: palette.muted }}>2 critical and 2 warning</p>
                        </div>
                      </div>
                      <span style={{ color: palette.muted }}>&gt;</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: "Avg. Resolution", value: "12m", meta: "down 8%" },
                      { title: "Resolved 24h", value: "3", meta: "best today" }
                    ].map((card) => (
                      <div
                        key={card.title}
                        className="border p-3"
                        style={{
                          borderColor: previewBorder,
                          borderRadius: `calc(10px + ${radius * 0.35}px)`,
                          backgroundColor: previewCardBg
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: palette.muted }}>{card.title}</p>
                        <p className="mt-3 text-lg font-semibold" style={{ color: palette.text }}>{card.value}</p>
                        <p className="mt-1 text-[10px]" style={{ color: palette.muted }}>{card.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <button
                  type="button"
                  className="w-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition"
                  onMouseEnter={() => setIsPreviewButtonHovered(true)}
                  onMouseLeave={() => setIsPreviewButtonHovered(false)}
                  onFocus={() => setIsPreviewButtonHovered(true)}
                  onBlur={() => setIsPreviewButtonHovered(false)}
                  style={{
                    borderColor: isPreviewButtonHovered ? previewHoverAccent : palette.accent,
                    backgroundColor: isPreviewButtonHovered ? previewHoverAccent : palette.accent,
                    color: previewOnAccentText,
                    boxShadow: isPreviewButtonHovered
                      ? `0 18px 42px -24px ${palette.accent}80, inset 0 0 0 1px ${previewOnAccentText}14`
                      : `0 16px 40px -24px ${palette.accent}73`,
                    borderRadius: `calc(10px + ${radius * 0.3}px)`,
                    transform: "none",
                    transition:
                      "background-color 360ms cubic-bezier(0.16, 1, 0.3, 1), border-color 360ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 360ms cubic-bezier(0.16, 1, 0.3, 1), color 240ms cubic-bezier(0.22, 1, 0.36, 1)"
                  }}
                >
                  Resolve Selected
                </button>
                <div className="mx-auto mt-4 h-1 w-20 rounded-full" style={{ backgroundColor: `${palette.muted}66` }} />
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </section>
  );
}
