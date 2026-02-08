import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic"

import {
  consumeLoginChallenge,
  createLoginChallenge,
  createSession,
  getUserById,
  getUserByUsername,
  logAudit
} from "../../../../lib/db";
import { toPublicUser } from "../../../../lib/public-user";
import { verifyTotp } from "../../../../lib/totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    username?: string;
    password?: string;
    totpCode?: string;
    challengeToken?: string;
  };

  if (payload.challengeToken) {
    const challenge = consumeLoginChallenge(payload.challengeToken);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge expired. Login again." }, { status: 401 });
    }
    const user = getUserById(challenge.userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json({ error: "Invalid login challenge" }, { status: 401 });
    }
    if (!verifyTotp(user.twoFactorSecret, payload.totpCode ?? "")) {
      return NextResponse.json({ error: "Invalid authentication code" }, { status: 401 });
    }
    const session = createSession(user.id);
    logAudit("auth.login", user.id, { username: user.username, method: "password+2fa" });
    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set("pulze_session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  }

  const user = getUserByUsername(payload.username ?? "");

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const isValid = bcrypt.compareSync(payload.password ?? "", user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.twoFactorEnabled) {
    const challenge = createLoginChallenge(user.id);
    logAudit("auth.login.challenge", user.id, { username: user.username });
    return NextResponse.json({
      requiresTwoFactor: true,
      challengeToken: challenge.token
    });
  }

  const session = createSession(user.id);
  logAudit("auth.login", user.id, { username: user.username, method: "password" });
  const response = NextResponse.json({ user: toPublicUser(user) });

  response.cookies.set("pulze_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}

