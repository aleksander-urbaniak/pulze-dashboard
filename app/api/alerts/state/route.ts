import { NextResponse } from "next/server";

import { getSessionUser } from "../../../../lib/auth";
import { logAudit, upsertAlertState } from "../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
