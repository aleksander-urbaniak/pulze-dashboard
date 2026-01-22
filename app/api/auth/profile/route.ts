import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { getSessionUser } from "../../../../lib/auth";
import { getUserByUsername, logAudit, updateUser } from "../../../../lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string;
    password?: string;
  };

  if (payload.username && payload.username !== user.username) {
    if (getUserByUsername(payload.username)) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }
  }

  const passwordHash = payload.password ? bcrypt.hashSync(payload.password, 10) : undefined;

  const updated = updateUser(user.id, {
    username: payload.username?.trim(),
    firstName: payload.firstName?.trim(),
    lastName: payload.lastName?.trim(),
    email: payload.email?.trim(),
    avatarUrl: payload.avatarUrl?.trim(),
    passwordHash
  });

  logAudit("profile.update", user.id, {
    userId: user.id,
    fields: Object.keys(payload).filter((key) => key !== "password")
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      username: updated.username,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      role: updated.role
    }
  });
}

