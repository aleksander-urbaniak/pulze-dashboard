import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getAuthProvidersSettings } from "../../../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const settings = getAuthProvidersSettings();
  return NextResponse.json({
    local: true,
    saml: settings.saml.enabled
  });
}

