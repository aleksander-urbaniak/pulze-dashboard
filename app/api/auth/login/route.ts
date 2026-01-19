import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { createSession, getUserByUsername, logAudit } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as { username: string; password: string };
  const user = getUserByUsername(payload.username);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = bcrypt.compareSync(payload.password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = createSession(user.id);
  logAudit("auth.login", user.id, { username: user.username });
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role
    }
  });

  response.cookies.set("pulze_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
