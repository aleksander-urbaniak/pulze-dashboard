"use client";

import { createContext, useContext } from "react";
import type { Settings, User } from "./types";

interface AppSession {
  user: User | null;
  settings: Settings | null;
}

export const AppSessionContext = createContext<AppSession | null>(null);

export function useAppSession() {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within an AppSessionProvider");
  }
  return context;
}
