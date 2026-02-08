import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"

import {
  consumeOidcState,
  createSession,
  createUser,
  getAuthProvidersSettings,
  getUserByEmail,
  getUserByExternalIdentity,
  logAudit,
  updateUser
} from "../../../../../../lib/db";

export const runtime = "nodejs";

type OidcDiscovery = {
  token_endpoint?: string;
  userinfo_endpoint?: string;
};

function parseName(name: string | undefined) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }
  const parts = trimmed.split(/\s+/);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  return { firstName, lastName };
}

function decodeJwtPayload(idToken: string | undefined) {
  if (!idToken) {
    return {};
  }
  const parts = idToken.split(".");
  if (parts.length < 2) {
    return {};
  }
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = payload + "=".repeat((4 - (payload.length % 4 || 4)) % 4);
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function resolveOidcEndpoints(settings: ReturnType<typeof getAuthProvidersSettings>) {
  const configuredToken = settings.oidc.tokenEndpoint.trim();
  const configuredUserinfo = settings.oidc.userinfoEndpoint.trim();
  if (configuredToken) {
    return {
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
  if (!discovered.token_endpoint) {
    return null;
  }
  return {
    tokenEndpoint: discovered.token_endpoint,
    userinfoEndpoint: configuredUserinfo || discovered.userinfo_endpoint || ""
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json({ error: "Missing OIDC callback params." }, { status: 400 });
  }
  const stateRow = consumeOidcState(state);
  if (!stateRow) {
    return NextResponse.json({ error: "OIDC state is invalid or expired." }, { status: 400 });
  }
  const settings = getAuthProvidersSettings();
  if (!settings.oidc.enabled) {
    return NextResponse.json({ error: "OIDC is disabled." }, { status: 404 });
  }
  const endpoints = await resolveOidcEndpoints(settings);
  if (!endpoints) {
    return NextResponse.json({ error: "OIDC endpoints are not configured." }, { status: 400 });
  }
  const redirectUri = `${url.origin}/api/auth/sso/oidc/callback`;
  const tokenResponse = await fetch(endpoints.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: settings.oidc.clientId,
      client_secret: settings.oidc.clientSecret,
      code_verifier: stateRow.codeVerifier
    }),
    cache: "no-store"
  });
  if (!tokenResponse.ok) {
    return NextResponse.json({ error: "OIDC token exchange failed." }, { status: 401 });
  }
  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
  };

  let claims: Record<string, unknown> = {};
  if (endpoints.userinfoEndpoint && tokenPayload.access_token) {
    const userInfoResponse = await fetch(endpoints.userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
      cache: "no-store"
    });
    if (userInfoResponse.ok) {
      claims = (await userInfoResponse.json()) as Record<string, unknown>;
    }
  }
  if (Object.keys(claims).length === 0) {
    claims = decodeJwtPayload(tokenPayload.id_token);
  }

  const subject = String(claims.sub ?? "").trim();
  const email = String(claims[settings.oidc.emailClaim] ?? "").trim();
  const usernameClaimValue = String(claims[settings.oidc.usernameClaim] ?? "").trim();
  const nameClaimValue = String(claims[settings.oidc.nameClaim] ?? "").trim();
  if (!subject) {
    return NextResponse.json({ error: "OIDC subject claim is missing." }, { status: 400 });
  }

  const username = usernameClaimValue || (email ? email.split("@")[0] : `oidc_${subject.slice(0, 10)}`);
  const fallbackEmail = email || `${username}@local.invalid`;
  const parsedName = parseName(nameClaimValue);

  let user = getUserByExternalIdentity("oidc", subject);
  if (!user && email) {
    const byEmail = getUserByEmail(email);
    if (byEmail) {
      user = updateUser(byEmail.id, {
        externalSubject: subject,
        authProvider: "oidc"
      });
    }
  }
  if (!user && settings.oidc.autoProvision) {
    const randomPassword = crypto.randomBytes(24).toString("hex");
    user = createUser({
      username,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      email: fallbackEmail,
      avatarUrl: "",
      password: randomPassword,
      role: "viewer",
      externalSubject: subject,
      authProvider: "oidc"
    });
  }
  if (!user) {
    return NextResponse.json({ error: "No local user mapped to this OIDC account." }, { status: 403 });
  }

  const session = createSession(user.id);
  logAudit("auth.login", user.id, { username: user.username, method: "oidc" });
  const response = NextResponse.redirect(new URL(stateRow.returnTo || "/", url.origin));
  response.cookies.set("pulze_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
