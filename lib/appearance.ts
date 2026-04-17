import type { AppearanceSettings, ThemePalette } from "./types";

export const defaultAppearance: AppearanceSettings = {
  light: {
    base: "#ECF4FA",
    surface: "#FFFFFF",
    text: "#0D1827",
    muted: "#5E718B",
    accent: "#0ECBB7",
    accentSoft: "#C9F7F2",
    border: "#CFDBEA"
  },
  dark: {
    base: "#060C18",
    surface: "#060F1F",
    text: "#E8EFFB",
    muted: "#64748B",
    accent: "#14D4BF",
    accentSoft: "#0D3136",
    border: "#1B2F4D"
  },
  branding: {
    logoUrl: "",
    faviconUrl: ""
  },
  background: {
    gradient: 88,
    glow: 34,
    noise: 20,
    radius: 24
  }
};

const legacyDefaultAppearance: AppearanceSettings = {
  light: {
    base: "#F6F4F0",
    surface: "#FFFFFF",
    text: "#14181E",
    muted: "#606874",
    accent: "#18866F",
    accentSoft: "#D6EEE8",
    border: "#E2E6E9"
  },
  dark: {
    base: "#080C16",
    surface: "#0F1623",
    text: "#E4E9F2",
    muted: "#94A0B4",
    accent: "#38C1A6",
    accentSoft: "#1E383A",
    border: "#273549"
  },
  branding: {
    logoUrl: "",
    faviconUrl: ""
  },
  background: {
    gradient: 100,
    glow: 0,
    noise: 100,
    radius: 24
  }
};

function normalizeHexString(value: string | undefined | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isLegacyDefaultAppearance(input: Partial<AppearanceSettings> | null | undefined) {
  if (!input) {
    return false;
  }
  const safe = input as AppearanceSettings;
  const colorsMatch =
    normalizeHexString(safe.light?.base) === normalizeHexString(legacyDefaultAppearance.light.base) &&
    normalizeHexString(safe.light?.surface) === normalizeHexString(legacyDefaultAppearance.light.surface) &&
    normalizeHexString(safe.light?.text) === normalizeHexString(legacyDefaultAppearance.light.text) &&
    normalizeHexString(safe.light?.muted) === normalizeHexString(legacyDefaultAppearance.light.muted) &&
    normalizeHexString(safe.light?.accent) === normalizeHexString(legacyDefaultAppearance.light.accent) &&
    normalizeHexString(safe.light?.accentSoft) ===
      normalizeHexString(legacyDefaultAppearance.light.accentSoft) &&
    normalizeHexString(safe.light?.border) === normalizeHexString(legacyDefaultAppearance.light.border) &&
    normalizeHexString(safe.dark?.base) === normalizeHexString(legacyDefaultAppearance.dark.base) &&
    normalizeHexString(safe.dark?.surface) === normalizeHexString(legacyDefaultAppearance.dark.surface) &&
    normalizeHexString(safe.dark?.text) === normalizeHexString(legacyDefaultAppearance.dark.text) &&
    normalizeHexString(safe.dark?.muted) === normalizeHexString(legacyDefaultAppearance.dark.muted) &&
    normalizeHexString(safe.dark?.accent) === normalizeHexString(legacyDefaultAppearance.dark.accent) &&
    normalizeHexString(safe.dark?.accentSoft) ===
      normalizeHexString(legacyDefaultAppearance.dark.accentSoft) &&
    normalizeHexString(safe.dark?.border) === normalizeHexString(legacyDefaultAppearance.dark.border);
  if (!colorsMatch) {
    return false;
  }
  const bg = safe.background ?? legacyDefaultAppearance.background;
  return (
    Number(bg.gradient) === legacyDefaultAppearance.background.gradient &&
    Number(bg.glow) === legacyDefaultAppearance.background.glow &&
    Number(bg.noise) === legacyDefaultAppearance.background.noise &&
    Number(bg.radius ?? legacyDefaultAppearance.background.radius) === legacyDefaultAppearance.background.radius
  );
}

export function normalizeAppearanceSettings(
  input: Partial<AppearanceSettings> | null | undefined
): AppearanceSettings {
  if (isLegacyDefaultAppearance(input)) {
    return defaultAppearance;
  }
  const safe = input ?? {};
  const lightAccent = normalizeHex(
    safe.light?.accent ?? safe.dark?.accent ?? defaultAppearance.light.accent,
    defaultAppearance.light.accent
  );
  const darkAccent = normalizeHex(
    safe.dark?.accent ?? safe.light?.accent ?? defaultAppearance.dark.accent,
    defaultAppearance.dark.accent
  );
  const lightAccentSoft = normalizeHex(
    safe.light?.accentSoft ?? defaultAppearance.light.accentSoft,
    defaultAppearance.light.accentSoft
  );
  const darkAccentSoft = normalizeHex(
    safe.dark?.accentSoft ?? defaultAppearance.dark.accentSoft,
    defaultAppearance.dark.accentSoft
  );
  return {
    light: {
      // Only accent is user-editable; keep the base light palette stable across the app.
      base: defaultAppearance.light.base,
      surface: defaultAppearance.light.surface,
      text: defaultAppearance.light.text,
      muted: defaultAppearance.light.muted,
      accent: ensureAccessibleAccent(lightAccent, "light", defaultAppearance.light.accent),
      accentSoft: lightAccentSoft,
      border: defaultAppearance.light.border
    },
    dark: {
      // Only accent is user-editable; keep the base dark palette stable across the app.
      base: defaultAppearance.dark.base,
      surface: defaultAppearance.dark.surface,
      text: defaultAppearance.dark.text,
      muted: defaultAppearance.dark.muted,
      accent: ensureAccessibleAccent(darkAccent, "dark", defaultAppearance.dark.accent),
      accentSoft: darkAccentSoft,
      border: defaultAppearance.dark.border
    },
    branding: {
      logoUrl: safe.branding?.logoUrl ?? defaultAppearance.branding.logoUrl,
      faviconUrl: safe.branding?.faviconUrl ?? defaultAppearance.branding.faviconUrl
    },
    background: {
      gradient: safe.background?.gradient ?? defaultAppearance.background.gradient,
      glow: safe.background?.glow ?? defaultAppearance.background.glow,
      noise: safe.background?.noise ?? defaultAppearance.background.noise,
      radius: safe.background?.radius ?? defaultAppearance.background.radius
    }
  };
}

function normalizeHex(value: string, fallback: string) {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const expanded = hex
      .split("")
      .map((char) => char + char)
      .join("");
    return `#${expanded.toUpperCase()}`;
  }
  return fallback;
}

function hexToRgbChannels(value: string, fallback: string) {
  const normalized = normalizeHex(value, fallback).slice(1);
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function rgbChannelsToHex(channels: number[]) {
  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixHex(value: string, target: string, ratio: number, fallback: string) {
  const sourceChannels = hexToRgbChannels(value, fallback);
  const targetChannels = hexToRgbChannels(target, target);
  return rgbChannelsToHex(
    sourceChannels.map((channel, index) => channel + (targetChannels[index] - channel) * ratio)
  );
}

function getLuminance(value: string, fallback: string) {
  const [red, green, blue] = hexToRgbChannels(value, fallback);
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
}

function ensureAccessibleAccent(value: string, mode: "light" | "dark", fallback: string) {
  let adjusted = normalizeHex(value, fallback);

  if (mode === "light") {
    while (getLuminance(adjusted, fallback) > 0.78) {
      adjusted = mixHex(adjusted, defaultAppearance.light.muted, 0.16, fallback);
    }
    return adjusted;
  }

  while (getLuminance(adjusted, fallback) < 0.28) {
    adjusted = mixHex(adjusted, defaultAppearance.dark.text, 0.18, fallback);
  }
  return adjusted;
}

function isLightColor(value: string, fallback: string) {
  return getLuminance(value, fallback) > 0.68;
}

function hexToRgbTriplet(value: string, fallback: string) {
  const normalized = normalizeHex(value, fallback).slice(1);
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  return `${red} ${green} ${blue}`;
}

function paletteToCss(palette: ThemePalette, fallback: ThemePalette) {
  return [
    `--base: ${hexToRgbTriplet(palette.base, fallback.base)};`,
    `--surface: ${hexToRgbTriplet(palette.surface, fallback.surface)};`,
    `--text: ${hexToRgbTriplet(palette.text, fallback.text)};`,
    `--muted: ${hexToRgbTriplet(palette.muted, fallback.muted)};`,
    `--accent: ${hexToRgbTriplet(palette.accent, fallback.accent)};`,
    `--accent-soft: ${hexToRgbTriplet(palette.accentSoft, fallback.accentSoft)};`,
    `--border: ${hexToRgbTriplet(palette.border, fallback.border)};`
  ].join("\n");
}

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, value));
}

function escapeCssUrl(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

function setFavicon(url: string) {
  if (typeof document === "undefined") {
    return;
  }
  const trimmed = url.trim();
  const id = "pulze-favicon";
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!trimmed) {
    if (link) {
      link.remove();
    }
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = trimmed;
}

export function applyAppearanceToDocument(appearance: AppearanceSettings) {
  if (typeof document === "undefined") {
    return;
  }
  const normalized = normalizeAppearanceSettings(appearance);
  const fallback = defaultAppearance;
  const lightCss = paletteToCss(normalized.light, fallback.light);
  const darkCss = paletteToCss(normalized.dark, fallback.dark);
  const gradient = clampPercent(normalized.background.gradient, fallback.background.gradient) / 100;
  const glow = clampPercent(normalized.background.glow, fallback.background.glow) / 100;
  const noise = 0;
  const radius = clampPercent(normalized.background.radius, fallback.background.radius);
  const glassEnabled = false;
  const logoUrl = normalized.branding.logoUrl.trim();
  const brandLogo = logoUrl ? `url("${escapeCssUrl(logoUrl)}")` : "none";

  const lightOnAccentTextColor = isLightColor(normalized.light.accent, fallback.light.accent)
    ? hexToRgbTriplet("#000000", "#000000")
    : hexToRgbTriplet("#FFFFFF", "#FFFFFF");
  const darkOnAccentTextColor = isLightColor(normalized.dark.accent, fallback.dark.accent)
    ? hexToRgbTriplet("#000000", "#000000")
    : hexToRgbTriplet("#FFFFFF", "#FFFFFF");

  const extras = [
    `--bg-gradient: ${gradient.toFixed(2)};`,
    `--bg-glow: ${glow.toFixed(2)};`,
    `--bg-noise: ${noise.toFixed(2)};`,
    `--ui-radius: ${Math.round(8 + radius * 0.44)}px;`,
    `--glass-blur: ${glassEnabled ? "10px" : "0px"};`,
    `--glass-shell-alpha: ${glassEnabled ? "0.94" : "0.92"};`,
    `--glass-panel-alpha: ${glassEnabled ? "0.9" : "0.95"};`,
    `--glass-field-alpha: ${glassEnabled ? "0.86" : "0.96"};`,
    `--glass-border-alpha: ${glassEnabled ? "0.9" : "0.88"};`,
    `--brand-logo-url: ${brandLogo};`
  ].join("\n");
  const styleId = "pulze-appearance-theme";
  const css = `:root {
${lightCss}
--on-accent-text: ${lightOnAccentTextColor};
${extras}
}

.dark {
${darkCss}
--on-accent-text: ${darkOnAccentTextColor};
}`;
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css;
  document.documentElement.dataset.brandLogo = logoUrl ? "true" : "false";
  document.documentElement.dataset.glass = "false";
  setFavicon(normalized.branding.faviconUrl);
}
