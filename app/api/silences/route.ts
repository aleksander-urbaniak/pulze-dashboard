import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { requirePermission } from "../../../lib/auth-guard";
import {
  createSilence,
  deleteSilence,
  listSilences,
  logAudit,
  updateSilence
} from "../../../lib/db";
import type { AlertSeverity, AlertSource } from "../../../lib/types";

export const runtime = "nodejs";

type SilencePayload = {
  id?: string;
  name?: string;
  sourceType?: AlertSource | "Any";
  sourceId?: string;
  sourceLabel?: string;
  servicePattern?: string;
  environmentPattern?: string;
  alertNamePattern?: string;
  instancePattern?: string;
  severity?: AlertSeverity | "Any";
  startsAt?: string;
  endsAt?: string;
  enabled?: boolean;
};

function isValidDateString(input: string | undefined) {
  if (!input) {
    return false;
  }
  const value = new Date(input).getTime();
  return Number.isFinite(value);
}

export async function GET(request: Request) {
  const permission = await requirePermission("silences.read");
  if (permission.response) {
    return permission.response;
  }
  const url = new URL(request.url);
  const includeExpired = url.searchParams.get("includeExpired") === "1";
  return NextResponse.json({
    silences: listSilences({ includeExpired })
  });
}

export async function POST(request: Request) {
  const permission = await requirePermission("silences.write");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;
  const payload = (await request.json()) as SilencePayload;
  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isValidDateString(payload.startsAt) || !isValidDateString(payload.endsAt)) {
    return NextResponse.json({ error: "Valid start/end dates are required." }, { status: 400 });
  }
  if (new Date(payload.endsAt as string).getTime() <= new Date(payload.startsAt as string).getTime()) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const silence = createSilence({
    name: payload.name.trim(),
    sourceType: payload.sourceType ?? "Any",
    sourceId: payload.sourceId?.trim() || undefined,
    sourceLabel: payload.sourceLabel?.trim() || undefined,
    servicePattern: payload.servicePattern?.trim() || undefined,
    environmentPattern: payload.environmentPattern?.trim() || undefined,
    alertNamePattern: payload.alertNamePattern?.trim() || undefined,
    instancePattern: payload.instancePattern?.trim() || undefined,
    severity: payload.severity ?? "Any",
    startsAt: new Date(payload.startsAt as string).toISOString(),
    endsAt: new Date(payload.endsAt as string).toISOString(),
    enabled: payload.enabled !== false,
    createdBy: user.id
  });

  logAudit("silences.create", user.id, {
    silenceId: silence.id,
    name: silence.name,
    sourceType: silence.sourceType
  });

  return NextResponse.json({ silence });
}

export async function PUT(request: Request) {
  const permission = await requirePermission("silences.write");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;
  const payload = (await request.json()) as SilencePayload;
  if (!payload.id) {
    return NextResponse.json({ error: "Silence id is required." }, { status: 400 });
  }
  if (payload.startsAt && !isValidDateString(payload.startsAt)) {
    return NextResponse.json({ error: "Invalid startsAt." }, { status: 400 });
  }
  if (payload.endsAt && !isValidDateString(payload.endsAt)) {
    return NextResponse.json({ error: "Invalid endsAt." }, { status: 400 });
  }
  const updates = {
    name: payload.name?.trim(),
    sourceType: payload.sourceType,
    sourceId: payload.sourceId?.trim() || undefined,
    sourceLabel: payload.sourceLabel?.trim() || undefined,
    servicePattern: payload.servicePattern?.trim() || undefined,
    environmentPattern: payload.environmentPattern?.trim() || undefined,
    alertNamePattern: payload.alertNamePattern?.trim() || undefined,
    instancePattern: payload.instancePattern?.trim() || undefined,
    severity: payload.severity,
    startsAt: payload.startsAt ? new Date(payload.startsAt).toISOString() : undefined,
    endsAt: payload.endsAt ? new Date(payload.endsAt).toISOString() : undefined,
    enabled: payload.enabled
  };
  if (
    updates.startsAt &&
    updates.endsAt &&
    new Date(updates.endsAt).getTime() <= new Date(updates.startsAt).getTime()
  ) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const silence = updateSilence(payload.id, updates);
  if (!silence) {
    return NextResponse.json({ error: "Silence not found." }, { status: 404 });
  }
  logAudit("silences.update", user.id, {
    silenceId: silence.id,
    name: silence.name,
    sourceType: silence.sourceType
  });
  return NextResponse.json({ silence });
}

export async function DELETE(request: Request) {
  const permission = await requirePermission("silences.write");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;
  const payload = (await request.json()) as { id?: string };
  if (!payload.id) {
    return NextResponse.json({ error: "Silence id is required." }, { status: 400 });
  }
  deleteSilence(payload.id);
  logAudit("silences.delete", user.id, { silenceId: payload.id });
  return NextResponse.json({ ok: true });
}

