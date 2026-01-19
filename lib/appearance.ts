import type { AppearanceSettings, ThemePalette } from "./types";

export const defaultAppearance: AppearanceSettings = {
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
    gradient: 90,
    glow: 35,
    noise: 8
  }
};

export function normalizeAppearanceSettings(
  input: Partial<AppearanceSettings> | null | undefined
): AppearanceSettings {
  const safe = input ?? {};
  return {
    light: {
      base: safe.light?.base ?? defaultAppearance.light.base,
      surface: safe.light?.surface ?? defaultAppearance.light.surface,
      text: safe.light?.text ?? defaultAppearance.light.text,
      muted: safe.light?.muted ?? defaultAppearance.light.muted,
      accent: safe.light?.accent ?? defaultAppearance.light.accent,
      accentSoft: safe.light?.accentSoft ?? defaultAppearance.light.accentSoft,
      border: safe.light?.border ?? defaultAppearance.light.border
    },
    dark: {
      base: safe.dark?.base ?? defaultAppearance.dark.base,
      surface: safe.dark?.surface ?? defaultAppearance.dark.surface,
      text: safe.dark?.text ?? defaultAppearance.dark.text,
      muted: safe.dark?.muted ?? defaultAppearance.dark.muted,
      accent: safe.dark?.accent ?? defaultAppearance.dark.accent,
      accentSoft: safe.dark?.accentSoft ?? defaultAppearance.dark.accentSoft,
      border: safe.dark?.border ?? defaultAppearance.dark.border
    },
    branding: {
      logoUrl: safe.branding?.logoUrl ?? defaultAppearance.branding.logoUrl,
      faviconUrl: safe.branding?.faviconUrl ?? defaultAppearance.branding.faviconUrl
    },
    background: {
      gradient: safe.background?.gradient ?? defaultAppearance.background.gradient,
      glow: safe.background?.glow ?? defaultAppearance.background.glow,
      noise: safe.background?.noise ?? defaultAppearance.background.noise
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
  const noise = clampPercent(normalized.background.noise, fallback.background.noise) / 100;
  const logoUrl = normalized.branding.logoUrl.trim();
  const brandLogo = logoUrl ? `url("${escapeCssUrl(logoUrl)}")` : "none";
  const extras = [
    `--bg-gradient: ${gradient.toFixed(2)};`,
    `--bg-glow: ${glow.toFixed(2)};`,
    `--bg-noise: ${noise.toFixed(2)};`,
    `--brand-logo-url: ${brandLogo};`
  ].join("\n");
  const styleId = "pulze-appearance-theme";
  const css = `:root {\n${lightCss}\n${extras}\n}\n\n.dark {\n${darkCss}\n}`;
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css;
  document.documentElement.dataset.brandLogo = logoUrl ? "true" : "false";
  setFavicon(normalized.branding.faviconUrl);
}
