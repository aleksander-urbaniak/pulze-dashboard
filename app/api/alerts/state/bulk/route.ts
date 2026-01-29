import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getSessionUser } from "../../../../../lib/auth";
import { logAudit, upsertAlertStatesBulk } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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


