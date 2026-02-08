import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { countAuditLogs, listAuditLogs } from "../../../lib/db";
import { requirePermission } from "../../../lib/auth-guard";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const permission = await requirePermission("audit.read");
  if (permission.response) {
    return permission.response;
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

