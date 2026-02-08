import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import { getAuthProvidersSettings } from "../../../../../../lib/db";
import { createSamlClient, getMissingSamlConfig, pickSsoStart, resolvePublicOrigin } from "../shared";

export const runtime = "nodejs";

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: Request) {
  const settings = getAuthProvidersSettings();
  if (!settings.saml.enabled) {
    return NextResponse.json({ error: "SAML is disabled." }, { status: 404 });
  }

  const missing = getMissingSamlConfig(settings, { requireEntryPoint: true });
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `SAML is not configured. Missing: ${missing.join(", ")}.`, missing },
      { status: 400 }
    );
  }

  const requestUrl = new URL(request.url);
  const publicOrigin = resolvePublicOrigin(request);
  const returnTo = normalizeReturnTo(requestUrl.searchParams.get("returnTo"));
  const start = pickSsoStart(settings);
  if (!start) {
    return NextResponse.json(
      { error: "Missing SAML SSO URL (Redirect, Post, or IdP-initiated)." },
      { status: 400 }
    );
  }

  if (start.mode === "idp-init") {
    try {
      const idpInitUrl = new URL(start.endpoint);
      if (returnTo !== "/" && !idpInitUrl.searchParams.has("RelayState")) {
        idpInitUrl.searchParams.set("RelayState", returnTo);
      }
      return NextResponse.redirect(idpInitUrl);
    } catch {
      return NextResponse.json({ error: "Invalid IdP-initiated URL." }, { status: 400 });
    }
  }

  try {
    const saml = await createSamlClient({
      origin: publicOrigin,
      settings,
      entryPoint: start.endpoint,
      mode: start.mode
    });

    if (start.mode === "post") {
      const form = await saml.getAuthorizeFormAsync(returnTo, undefined, {});
      return new NextResponse(form, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    const redirectUrl = await saml.getAuthorizeUrlAsync(returnTo, undefined, {});
    return NextResponse.redirect(redirectUrl, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate SAML login request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
