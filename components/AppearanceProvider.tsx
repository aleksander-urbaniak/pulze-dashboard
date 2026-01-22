"use client";

import { useEffect } from "react";

import {
  applyAppearanceToDocument,
  defaultAppearance,
  normalizeAppearanceSettings
} from "../lib/appearance";
import type { AppearanceSettings } from "../lib/types";
type SettingsResponse = { settings: { appearance?: AppearanceSettings } };

export default function AppearanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let isMounted = true;
    async function loadAppearance() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as SettingsResponse;
        if (isMounted) {
          const normalized = normalizeAppearanceSettings(
            data.settings.appearance ?? defaultAppearance
          );
          applyAppearanceToDocument(normalized);
        }
      } catch {
        if (isMounted) {
          applyAppearanceToDocument(defaultAppearance);
        }
      }
    }
    void loadAppearance();
    return () => {
      isMounted = false;
    };
  }, []);

  return <>{children}</>;
}
