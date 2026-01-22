import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { countAuditLogs, listAuditLogs } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "25");
  const pageSize = Number.isFinite(pageSizeParam)
    ? Math.min(Math.max(pageSizeParam, 5), 200)
    : 25;
  const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;
  const total = countAuditLogs();
  const offset = (page - 1) * pageSize;
  const logs = listAuditLogs(pageSize, offset);
  return NextResponse.json({ logs, total });
}

