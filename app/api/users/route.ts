import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic"

import {
  createUser,
  getUserById,
  getUserByUsername,
  listUsers,
  logAudit,
  updateUser
} from "../../../lib/db";
import { requirePermission } from "../../../lib/auth-guard";
import { toPublicUser } from "../../../lib/public-user";
import type { UserRole } from "../../../lib/types";

export const runtime = "nodejs";

function normalizeRole(role: unknown): UserRole {
  return role === "admin" ||
    role === "manager" ||
    role === "operator" ||
    role === "auditor"
    ? role
    : "viewer";
}

export async function GET() {
  const permission = await requirePermission("users.manage");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;
  const users = listUsers().map(toPublicUser);
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const permission = await requirePermission("users.manage");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const payload = (await request.json()) as {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    password: string;
    role: UserRole;
  };

  if (getUserByUsername(payload.username)) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const created = createUser({
    username: payload.username.trim(),
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim(),
    avatarUrl: payload.avatarUrl?.trim() ?? "",
    password: payload.password,
    role: normalizeRole(payload.role)
  });

  logAudit("users.create", user.id, {
    userId: created.id,
    username: created.username,
    role: created.role
  });

  return NextResponse.json({ user: toPublicUser(created) });
}

export async function PATCH(request: Request) {
  const permission = await requirePermission("users.manage");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const payload = (await request.json()) as {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
    password?: string;
    role?: UserRole;
  };

  const existing = getUserById(payload.id);
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (payload.username && payload.username !== existing.username) {
    if (getUserByUsername(payload.username)) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
  }

  const password = payload.password?.trim();
  const passwordHash = password ? bcrypt.hashSync(password, 10) : undefined;
  const updated = updateUser(payload.id, {
    username: payload.username?.trim(),
    firstName: payload.firstName?.trim(),
    lastName: payload.lastName?.trim(),
    email: payload.email?.trim(),
    avatarUrl: payload.avatarUrl?.trim(),
    passwordHash,
    role: payload.role ? normalizeRole(payload.role) : undefined
  });

  logAudit("users.update", user.id, {
    userId: updated.id,
    username: updated.username,
    role: updated.role,
    passwordChanged: Boolean(passwordHash)
  });

  return NextResponse.json({ user: toPublicUser(updated) });
}

