import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { requirePermission } from "../../../../lib/auth-guard";
import { logAudit, upsertAlertState } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const permission = await requirePermission("alerts.ack");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;

  const payload = (await request.json()) as {
    alertId?: string;
    status?: "active" | "acknowledged" | "resolved";
    note?: string;
  };

  if (!payload.alertId || !payload.status) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const note = payload.note?.trim() ?? "";
  const state = upsertAlertState({
    alertId: payload.alertId,
    status: payload.status,
    note,
    userId: user.id
  });

  logAudit("alerts.state.update", user.id, {
    alertId: payload.alertId,
    status: payload.status,
    note
  });

  return NextResponse.json({
    state: {
      alertId: state.alertId,
      status: state.status,
      note: state.note,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
      acknowledgedAt: state.acknowledgedAt,
      resolvedAt: state.resolvedAt
    }
  });
}

