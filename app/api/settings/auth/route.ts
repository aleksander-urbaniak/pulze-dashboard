import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { requirePermission } from "../../../../lib/auth-guard";
import { getAuthProvidersSettings, logAudit, updateAuthProvidersSettings } from "../../../../lib/db";
import type { AuthProvidersSettings } from "../../../../lib/types";

export const runtime = "nodejs";

function maskSecrets(settings: AuthProvidersSettings) {
  return {
    ...settings,
    oidc: {
      ...settings.oidc,
      enabled: false,
      clientSecret: settings.oidc.clientSecret ? "********" : ""
    }
  };
}

export async function GET() {
  const permission = await requirePermission("settings.write");
  if (permission.response) {
    return permission.response;
  }
  const settings = getAuthProvidersSettings();
  return NextResponse.json({ settings: maskSecrets(settings) });
}

export async function PUT(request: Request) {
  const permission = await requirePermission("settings.write");
  if (permission.response) {
    return permission.response;
  }
  const user = permission.user;
  const payload = (await request.json()) as Partial<AuthProvidersSettings>;
  const next = updateAuthProvidersSettings({
    oidc: {
      enabled: false
    },
    saml: payload.saml
  });
  logAudit("settings.auth.update", user.id, {
    samlEnabled: next.saml.enabled
  });
  return NextResponse.json({ settings: maskSecrets(next) });
}
