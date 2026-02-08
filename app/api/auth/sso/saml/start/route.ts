import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { getAuthProvidersSettings } from "../../../../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  const settings = getAuthProvidersSettings();
  if (!settings.saml.enabled) {
    return NextResponse.json({ error: "SAML is disabled." }, { status: 404 });
  }
  return NextResponse.json(
    {
      error:
        "SAML login requires IdP metadata/signature verification wiring and is not enabled in this build."
    },
    { status: 501 }
  );
}

