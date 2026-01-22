import clsx from "clsx";

import { defaultAppearance } from "../../../lib/appearance";
import type { Settings, ThemePalette } from "../../../lib/types";

type AppearanceSectionProps = {
  settingsDraft: Settings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<Settings>>;
  canEditSettings: boolean;
  settingsStatus: string | null;
  isAdmin: boolean;
  onSave: () => void;
  onUpdateAppearance: (mode: "light" | "dark", key: keyof ThemePalette, value: string) => void;
  onUpdateBranding: (key: "logoUrl" | "faviconUrl", value: string) => void;
  onUpdateBackground: (key: "gradient" | "glow" | "noise", value: number) => void;
  onAssetUpload: (file: File | null, onChange: (value: string) => void) => void;
  onSetTheme: (theme: string) => void;
};

const appearanceFields: Array<{ key: keyof ThemePalette; label: string }> = [
  { key: "base", label: "Base" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted" },
  { key: "accent", label: "Accent" },
  { key: "accentSoft", label: "Accent Soft" },
  { key: "border", label: "Border" }
];

export default function AppearanceSection({
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
  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
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
                onClick={onSave}
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
                  <p className="text-xs text-muted">Upload a logo and favicon to customize the shell.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBranding("logoUrl", "");
                    onUpdateBranding("faviconUrl", "");
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
                          onAssetUpload(event.target.files?.[0] ?? null, (value) =>
                            onUpdateBranding("logoUrl", value)
                          )
                        }
                        className="w-full text-xs text-muted"
                      />
                      <input
                        value={settingsDraft.appearance.branding.logoUrl}
                        onChange={(event) => onUpdateBranding("logoUrl", event.target.value)}
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
                          onAssetUpload(event.target.files?.[0] ?? null, (value) =>
                            onUpdateBranding("faviconUrl", value)
                          )
                        }
                        className="w-full text-xs text-muted"
                      />
                      <input
                        value={settingsDraft.appearance.branding.faviconUrl}
                        onChange={(event) => onUpdateBranding("faviconUrl", event.target.value)}
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
                <p className="text-xs text-muted">Adjust gradient, glow, and grain intensity.</p>
              </div>
              <div className="mt-4 space-y-4">
                {([
                  { key: "gradient", label: "Gradient" },
                  { key: "glow", label: "Glow" },
                  { key: "noise", label: "Grain" }
                ] as Array<{ key: "gradient" | "glow" | "noise"; label: string }>).map((item) => (
                  <label key={item.key} className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settingsDraft.appearance.background[item.key]}
                        onChange={(event) => onUpdateBackground(item.key, Number(event.target.value))}
                        disabled={!canEditSettings}
                        style={
                          {
                            "--range-percent": `${settingsDraft.appearance.background[item.key]}%`
                          } as React.CSSProperties
                        }
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
                          onChange={(event) => onUpdateAppearance(mode, field.key, event.target.value)}
                          disabled={!canEditSettings}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-base/60 p-1"
                        />
                        <input
                          value={settingsDraft.appearance[mode][field.key]}
                          onChange={(event) => onUpdateAppearance(mode, field.key, event.target.value)}
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
        <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Live Preview</p>
              <h3 className="mt-2 text-lg font-semibold">Dashboard tiles</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSetTheme("light")}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => onSetTheme("dark")}
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
  );
}
