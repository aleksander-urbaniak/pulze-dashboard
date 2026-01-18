import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { createUser, getUserById, getUserByUsername, listUsers, updateUser } from "../../../lib/db";

export const runtime = "nodejs";

function toPublicUser(user: ReturnType<typeof getUserById>) {
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
    role: user.role
  };
}

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = listUsers().map(toPublicUser);
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    password: string;
    role: "viewer" | "admin";
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
    role: payload.role
  });

  return NextResponse.json({ user: toPublicUser(created) });
}

export async function PATCH(request: Request) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
    role?: "viewer" | "admin";
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

  const updated = updateUser(payload.id, {
    username: payload.username?.trim(),
    firstName: payload.firstName?.trim(),
    lastName: payload.lastName?.trim(),
    email: payload.email?.trim(),
    avatarUrl: payload.avatarUrl?.trim(),
    role: payload.role
  });

  return NextResponse.json({ user: toPublicUser(updated) });
}
