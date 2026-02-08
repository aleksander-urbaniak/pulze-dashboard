import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { requirePermission } from "../../../../lib/auth-guard";
import {
  countAlertLogSince,
  listAlertLogPageSince,
  pruneAlertLogBefore
} from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const permission = await requirePermission("analytics.read");
  if (permission.response) {
    return permission.response;
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = new URL(request.url);
  const pageParam = Number(url.searchParams.get("page") ?? "1");
  const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "25");
  const query = url.searchParams.get("query") ?? "";
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(200, Math.floor(pageSizeParam))
      : 25;
  const offset = (page - 1) * pageSize;
  pruneAlertLogBefore(cutoff);
  const total = countAlertLogSince(cutoff, query);
  const alerts = listAlertLogPageSince({ cutoff, query, limit: pageSize, offset });
  return NextResponse.json(
    { alerts, total, page, pageSize },
    { headers: { "Cache-Control": "no-store" } }
  );
}

