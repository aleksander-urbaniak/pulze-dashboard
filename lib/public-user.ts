import type { UserRow } from "./db";
import { permissionsForRole } from "./rbac";

export function toPublicUser(user: UserRow | null) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    permissions: permissionsForRole(user.role),
    twoFactorEnabled: Boolean(user.twoFactorEnabled)
  };
}

