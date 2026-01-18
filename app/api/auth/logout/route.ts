import { NextResponse } from "next/server";

import { getSessionToken } from "../../../../lib/auth";
import { deleteSession } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST() {
  const token = getSessionToken();
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
