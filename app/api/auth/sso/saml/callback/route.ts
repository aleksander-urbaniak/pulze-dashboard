import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "SAML callback is not implemented in this build. Use OIDC SSO or local auth with 2FA."
    },
    { status: 501 }
  );
}

