import clsx from "clsx";
import { useTheme } from "next-themes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from "@fortawesome/free-solid-svg-icons";

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
        <span className="text-[11px] font-mono text-slate-400">
          {value}
          {suffix}
        </span>
      </div>
      <div className="radius-ui border border-[#22395c] bg-[#091425] px-3 py-3">
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

  function handleAccentChange(value: string) {
    onUpdateAppearance("dark", "accent", value);
    onUpdateAppearance("light", "accent", value);
    onUpdateAppearance("dark", "accentSoft", mixHex("#0A0C12", value, 0.24));
    onUpdateAppearance("light", "accentSoft", mixHex("#ECF4FA", value, 0.18));
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faPalette} className="h-5 w-5 shrink-0 text-accent" />
            <h2 className="text-[2.2rem] font-semibold leading-none text-text">Theme Studio</h2>
          </div>
          {headerRight}
        </div>
        <p className="mt-2 text-sm text-slate-500">Tune branding, accent, and visual effects across the dashboard.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
      <aside className={clsx(settingsShellCard, "custom-scrollbar p-5 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto")}>
        <div className="space-y-8">
          {settingsStatus ? <p className="text-sm text-slate-300">{settingsStatus}</p> : null}
          {!isAdmin ? <p className="text-sm text-slate-500">Only admins can update the global appearance.</p> : null}

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-slate-100">Branding</h3>
            <label className="radius-panel block cursor-pointer border-2 border-dashed border-[#27466c] bg-[#07101f] p-6 text-center transition hover:border-accent/45 hover:bg-accent/5">
              <div className="radius-pill mx-auto flex h-11 w-11 items-center justify-center bg-accent/20 text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-100">Upload Workspace Logo</p>
              <p className="mt-1 text-xs text-slate-500">SVG or PNG, Max 2MB</p>
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
              <h3 className="text-sm font-medium text-slate-100">Theme Engine</h3>
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
                  <div className="radius-ui flex items-center gap-2 border border-[#22395c] bg-[#091425] p-2">
                    <input
                      type="color"
                      value={palette.accent}
                      disabled={!canEditSettings}
                      onChange={(event) => handleAccentChange(event.target.value)}
                      className="h-9 w-9 rounded-lg border-0 bg-transparent p-0"
                    />
                    <span className="text-xs font-mono uppercase text-slate-300">{palette.accent}</span>
                  </div>
                </label>

                <div className="space-y-2">
                  <span className={settingsLabelClass}>Appearance</span>
                  <div className="radius-ui flex border border-[#22395c] bg-[#091425] p-1">
                    <button
                      type="button"
                      onClick={() => onSetTheme("dark")}
                      className={clsx(
                        "radius-ui flex-1 py-2 transition",
                        isDarkTheme
                          ? "bg-accent/15 text-accent"
                          : "text-slate-200 hover:text-accent"
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
                          ? "bg-accent/15 text-accent"
                          : "text-slate-200 hover:text-accent"
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
        <div className="absolute left-8 top-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
                      backgroundColor: `${palette.accent}22`,
                      color: palette.muted
                    }}
                  >
                    P
                  </div>
                  <div
                    className="h-8 w-8 rounded-full border"
                    style={{ borderColor: palette.muted, backgroundColor: `${palette.muted}33` }}
                  />
                </div>

                <div className="mt-5">
                  <h4 className="text-xl font-bold" style={{ color: palette.text }}>{appName}</h4>
                  <p className="mt-1 text-[11px]" style={{ color: palette.muted }}>{customUrl}</p>
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
                        <span className="h-7 w-7 rounded-lg" style={{ backgroundColor: `${palette.accent}26` }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: palette.text }}>Weekly Growth</p>
                          <p className="text-[10px]" style={{ color: palette.muted }}>Active Analytics</p>
                        </div>
                      </div>
                      <span style={{ color: palette.muted }}>&gt;</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[{ title: "Tasks Done", value: "12" }, { title: "Theme Swaps", value: "45" }].map((card) => (
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
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <button
                  className="w-full py-3 text-xs font-bold uppercase tracking-[0.16em] transition hover:brightness-110"
                  style={{
                    backgroundColor: palette.accent,
                    color: isDarkTheme ? "#040a16" : "#ffffff",
                    borderRadius: `calc(10px + ${radius * 0.3}px)`
                  }}
                >
                  Execute Task
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
