import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { listAuditLogs } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = listAuditLogs(150);
  return NextResponse.json({ logs });
}
