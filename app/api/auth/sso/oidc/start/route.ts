import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import { createOidcState, getAuthProvidersSettings } from "../../../../../../lib/db";

export const runtime = "nodejs";

type OidcDiscovery = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
};

function base64url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeVerifier() {
  return base64url(crypto.randomBytes(32));
}

function createCodeChallenge(verifier: string) {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

async function resolveOidcEndpoints(settings: ReturnType<typeof getAuthProvidersSettings>) {
  const configuredAuth = settings.oidc.authorizationEndpoint.trim();
  const configuredToken = settings.oidc.tokenEndpoint.trim();
  const configuredUserinfo = settings.oidc.userinfoEndpoint.trim();
  if (configuredAuth && configuredToken) {
    return {
      authorizationEndpoint: configuredAuth,
      tokenEndpoint: configuredToken,
      userinfoEndpoint: configuredUserinfo
    };
  }
  if (!settings.oidc.issuerUrl.trim()) {
    return null;
  }
  const issuer = settings.oidc.issuerUrl.replace(/\/+$/, "");
  const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const discovered = (await response.json()) as OidcDiscovery;
  if (!discovered.authorization_endpoint || !discovered.token_endpoint) {
    return null;
  }
  return {
    authorizationEndpoint: discovered.authorization_endpoint,
    tokenEndpoint: discovered.token_endpoint,
    userinfoEndpoint: discovered.userinfo_endpoint ?? configuredUserinfo
  };
}

export async function GET(request: Request) {
  const settings = getAuthProvidersSettings();
  if (!settings.oidc.enabled) {
    return NextResponse.json({ error: "OIDC is disabled." }, { status: 404 });
  }
  if (!settings.oidc.clientId || !settings.oidc.clientSecret) {
    return NextResponse.json({ error: "OIDC is not configured." }, { status: 400 });
  }
  const endpoints = await resolveOidcEndpoints(settings);
  if (!endpoints) {
    return NextResponse.json({ error: "Unable to resolve OIDC endpoints." }, { status: 400 });
  }

  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  const stateRow = createOidcState(verifier, returnTo, 10);
  const redirectUri = `${url.origin}/api/auth/sso/oidc/callback`;

  const authorizationUrl = new URL(endpoints.authorizationEndpoint);
  authorizationUrl.searchParams.set("client_id", settings.oidc.clientId);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", settings.oidc.scopes || "openid profile email");
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("state", stateRow.state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authorizationUrl);
}

