import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { createSession, createUser, countUsers, logAudit } from "../../../../lib/db";
import { toPublicUser } from "../../../../lib/public-user";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ needsSetup: countUsers() === 0 });
}

export async function POST(request: Request) {
  if (countUsers() > 0) {
    return NextResponse.json({ error: "Setup already complete" }, { status: 409 });
  }

  const payload = (await request.json()) as {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    password: string;
  };

  if (!payload.username || !payload.password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const user = createUser({
    username: payload.username.trim(),
    firstName: payload.firstName?.trim() ?? "",
    lastName: payload.lastName?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    avatarUrl: payload.avatarUrl?.trim() ?? "",
    password: payload.password,
    role: "admin"
  });

  const session = createSession(user.id);
  logAudit("auth.bootstrap", user.id, { username: user.username });
  const response = NextResponse.json({ user: toPublicUser(user) });

  response.cookies.set("pulze_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}


