import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../lib/auth";
import { toPublicUser } from "../../../../lib/public-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}

