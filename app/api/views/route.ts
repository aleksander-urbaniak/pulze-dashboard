import { NextResponse } from "next/server";

import { getSessionUser } from "../../../lib/auth";
import { createSavedView, deleteSavedView, listSavedViews, logAudit } from "../../../lib/db";
import type { SavedViewFilters } from "../../../lib/types";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const views = listSavedViews(user.id);
  return NextResponse.json({ views });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { name?: string; filters?: SavedViewFilters };
  const name = payload.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "View name required" }, { status: 400 });
  }
  if (!payload.filters) {
    return NextResponse.json({ error: "Filters required" }, { status: 400 });
  }

  const view = createSavedView(user.id, name, payload.filters);
  logAudit("views.create", user.id, { viewId: view.id, name });
  return NextResponse.json({ view });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "View id required" }, { status: 400 });
  }
  deleteSavedView(user.id, payload.id);
  logAudit("views.delete", user.id, { viewId: payload.id });
  return NextResponse.json({ ok: true });
}

