import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      error: "OIDC is no longer supported in this build. Use SAML SSO instead."
    },
    { status: 410 }
  );
}
