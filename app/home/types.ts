import type { Alert, DataSourceHealth, Settings, User } from "../../lib/types";

export type ApiError = { source: string; message: string };

export type AlertResponse = {
  alerts: Alert[];
  errors: ApiError[];
  health?: {
    staleThresholdMs: number;
    sources: DataSourceHealth[];
    staleSources: DataSourceHealth[];
  };
};

export type SettingsResponse = { settings: Settings; canEdit: boolean };

export type UserResponse = { user: User };

export type BootstrapResponse = { needsSetup: boolean };
