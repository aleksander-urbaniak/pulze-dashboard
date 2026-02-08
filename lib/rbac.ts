import type { User, UserRole } from "./types";

export type Permission =
  | "dashboard.read"
  | "analytics.read"
  | "alerts.ack"
  | "settings.read"
  | "settings.write"
  | "silences.read"
  | "silences.write"
  | "users.manage"
  | "audit.read";

const rolePermissions: Record<UserRole, Permission[]> = {
  viewer: ["dashboard.read", "analytics.read", "silences.read"],
  operator: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read",
    "silences.read",
    "silences.write"
  ],
  manager: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read",
    "settings.write",
    "silences.read",
    "silences.write"
  ],
  auditor: ["dashboard.read", "analytics.read", "audit.read", "silences.read"],
  admin: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read",
    "settings.write",
    "silences.read",
    "silences.write",
    "users.manage",
    "audit.read"
  ]
};

export function permissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] ?? rolePermissions.viewer;
}

export function hasPermission(user: Pick<User, "role"> | null | undefined, permission: Permission) {
  if (!user) {
    return false;
  }
  return permissionsForRole(user.role).includes(permission);
}
