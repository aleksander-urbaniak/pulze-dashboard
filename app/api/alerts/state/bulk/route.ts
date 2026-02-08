import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { requirePermission } from "../../../../../lib/auth-guard";
import { logAudit, upsertAlertStatesBulk } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const permission = await requirePermission("alerts.ack");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const payload = (await request.json()) as {
    alertIds?: string[];
    status?: "active" | "acknowledged" | "resolved";
    note?: string | null;
  };

  if (!payload.alertIds || !Array.isArray(payload.alertIds) || payload.alertIds.length === 0) {
    return NextResponse.json({ error: "Alert ids required" }, { status: 400 });
  }

  if (!payload.status) {
    return NextResponse.json({ error: "Status required" }, { status: 400 });
  }

  const states = upsertAlertStatesBulk({
    alertIds: payload.alertIds,
    status: payload.status,
    note: payload.note ?? null,
    userId: user.id
  });

  logAudit("alerts.state.bulk", user.id, {
    alertCount: payload.alertIds.length,
    status: payload.status
  });

  return NextResponse.json({ states });
}

