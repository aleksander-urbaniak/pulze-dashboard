import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getSessionUser } from "../../../../../lib/auth";
import {
  beginUserTwoFactorEnrollment,
  enableUserTwoFactor,
  getUserById,
  logAudit
} from "../../../../../lib/db";
import { toPublicUser } from "../../../../../lib/public-user";
import { buildTotpUri, generateTotpSecret, verifyTotp } from "../../../../../lib/totp";

export const runtime = "nodejs";

const issuerName = "PulZe Dashboard";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const current = getUserById(user.id);
  if (!current) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (current.twoFactorEnabled) {
    return NextResponse.json({
      enabled: true,
      secret: null,
      otpauthUri: null
    });
  }
  let secret = current.twoFactorSecret;
  if (!secret) {
    secret = generateTotpSecret();
    beginUserTwoFactorEnrollment(current.id, secret);
  }
  const account = current.email?.trim() || current.username;
  return NextResponse.json({
    enabled: Boolean(current.twoFactorEnabled),
    secret,
    otpauthUri: buildTotpUri(secret, account, issuerName)
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as { code?: string };
  const current = getUserById(user.id);
  if (!current || !current.twoFactorSecret) {
    return NextResponse.json({ error: "2FA setup not initialized." }, { status: 400 });
  }
  if (!verifyTotp(current.twoFactorSecret, payload.code ?? "")) {
    return NextResponse.json({ error: "Invalid authentication code." }, { status: 400 });
  }
  const updated = enableUserTwoFactor(user.id);
  logAudit("auth.2fa.enable", user.id, { username: user.username });
  return NextResponse.json({ user: toPublicUser(updated) });
}
