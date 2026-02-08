import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getSessionUser } from "../../../../../lib/auth";
import { disableUserTwoFactor, getUserById, logAudit } from "../../../../../lib/db";
import { toPublicUser } from "../../../../../lib/public-user";
import { verifyTotp } from "../../../../../lib/totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as { code?: string };
  const current = getUserById(user.id);
  if (!current || !current.twoFactorEnabled || !current.twoFactorSecret) {
    return NextResponse.json({ error: "2FA is not enabled." }, { status: 400 });
  }
  if (!verifyTotp(current.twoFactorSecret, payload.code ?? "")) {
    return NextResponse.json({ error: "Invalid authentication code." }, { status: 400 });
  }
  const updated = disableUserTwoFactor(current.id);
  logAudit("auth.2fa.disable", user.id, { username: user.username });
  return NextResponse.json({ user: toPublicUser(updated) });
}

