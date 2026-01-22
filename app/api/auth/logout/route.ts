import { NextResponse } from "next/server";

import { getSessionToken, getSessionUser } from "../../../../lib/auth";
import { deleteSession, logAudit } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST() {
  const token = await getSessionToken();
  const user = await getSessionUser();
  if (user) {
    logAudit("auth.logout", user.id, { username: user.username });
  }
  if (token) {
    deleteSession(token);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("pulze_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}

