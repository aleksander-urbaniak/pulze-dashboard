import { NextResponse } from "next/server";

import { getSessionUser } from "./auth";
import type { UserRow } from "./db";
import type { Permission } from "./rbac";
import { hasPermission } from "./rbac";

type PermissionResult =
  | { user: null; response: NextResponse }
  | { user: UserRow; response: null };

export async function requirePermission(permission: Permission): Promise<PermissionResult> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user, permission)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }
  return { user, response: null };
}
