import type { User, UserRole } from "./types";

export type Permission =
  | "dashboard.read"
  | "analytics.read"
  | "alerts.ack"
  | "settings.read"
  | "settings.write"
  | "users.manage"
  | "audit.read";

const rolePermissions: Record<UserRole, Permission[]> = {
  viewer: ["dashboard.read", "analytics.read"],
  operator: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read"
  ],
  manager: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read",
    "settings.write"
  ],
  auditor: ["dashboard.read", "analytics.read", "audit.read"],
  admin: [
    "dashboard.read",
    "analytics.read",
    "alerts.ack",
    "settings.read",
    "settings.write",
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
