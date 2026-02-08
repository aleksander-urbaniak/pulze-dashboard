import crypto from "crypto";
import { type Profile } from "@node-saml/node-saml";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import {
  createSession,
  createUser,
  getAuthProvidersSettings,
  getUserByEmail,
  getUserByExternalIdentity,
  getUserByUsername,
  logAudit,
  updateUser
} from "../../../../../../lib/db";
import {
  createSamlClient,
  extractCertificatesFromEncodedSamlResponse,
  getMissingSamlConfig,
  pickSsoValidationEntryPoint,
  resolvePublicOrigin
} from "../shared";

export const runtime = "nodejs";

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function isUnsignedFallbackAllowed(certValue: string) {
  const raw = (process.env.SAML_ALLOW_UNSIGNED ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") {
    return true;
  }
  if (raw === "0" || raw === "false" || raw === "no") {
    return false;
  }
  return !certValue.trim();
}

function parseUnsignedSamlProfile(samlResponse: string): Profile | null {
  let xml = "";
  try {
    xml = Buffer.from(samlResponse, "base64").toString("utf8");
  } catch {
    return null;
  }

  const issuerMatch = xml.match(/<(?:[A-Za-z0-9_-]+:)?Issuer\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?Issuer>/i);
  const issuer = decodeXmlEntities((issuerMatch?.[1] ?? "").trim());

  const nameIdMatch = xml.match(
    /<(?:[A-Za-z0-9_-]+:)?NameID\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?NameID>/i
  );
  if (!nameIdMatch) {
    return null;
  }

  const nameIdAttributes = nameIdMatch[1] ?? "";
  const nameID = decodeXmlEntities((nameIdMatch[2] ?? "").trim());
  const formatMatch = nameIdAttributes.match(/\bFormat="([^"]+)"/i);
  const nameIDFormat = decodeXmlEntities((formatMatch?.[1] ?? "").trim());

  const claims: Record<string, unknown> = {};
  const attributeMatches = xml.matchAll(
    /<(?:[A-Za-z0-9_-]+:)?Attribute\b[^>]*Name="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?Attribute>/gi
  );
  for (const match of attributeMatches) {
    const name = decodeXmlEntities((match[1] ?? "").trim());
    if (!name) {
      continue;
    }
    const body = match[2] ?? "";
    const values = [...body.matchAll(/<(?:[A-Za-z0-9_-]+:)?AttributeValue\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?AttributeValue>/gi)]
      .map((valueMatch) => decodeXmlEntities((valueMatch[1] ?? "").trim()))
      .filter(Boolean);
    if (values.length === 1) {
      claims[name] = values[0];
    } else if (values.length > 1) {
      claims[name] = values;
    }
  }

  return {
    issuer,
    nameID,
    nameIDFormat,
    ...claims
  } as Profile;
}

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === "string" && entry.trim()) {
          return entry.trim();
        }
      }
    }
  }
  return "";
}

function parseName(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }
  const parts = normalized.split(/\s+/);
  return {
    firstName: parts.shift() ?? "",
    lastName: parts.join(" ")
  };
}

function claimValue(claims: Record<string, unknown>, key: string) {
  const trimmed = key.trim();
  if (!trimmed) {
    return "";
  }
  const direct = claims[trimmed];
  if (direct !== undefined) {
    return firstString(direct);
  }
  const target = trimmed.toLowerCase();
  for (const [claimKey, claimValueEntry] of Object.entries(claims)) {
    if (claimKey.toLowerCase() === target) {
      return firstString(claimValueEntry);
    }
  }
  return "";
}

function resolveIdentity(profile: Profile, usernameAttribute: string) {
  const claims = profile as unknown as Record<string, unknown>;
  const usernameFromAttribute = claimValue(claims, usernameAttribute);
  const email = firstString(
    claims.email,
    claims.mail,
    claims.emailaddress,
    claims["urn:oid:0.9.2342.19200300.100.1.3"],
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]
  );
  const subject = firstString(profile.nameID, claims.sub, claims.NameID, usernameFromAttribute, email);
  const username =
    usernameFromAttribute ||
    firstString(
      claims.preferred_username,
      claims.username,
      claims.user_name,
      claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
      profile.nameID
    ) || (email ? email.split("@")[0] : "");
  const displayName = firstString(
    claims.displayName,
    claims.name,
    claims.cn,
    `${firstString(claims.given_name, claims.givenName)} ${firstString(claims.family_name, claims.sn, claims.surname)}`
  );
  return { subject, email, username, displayName };
}

export async function POST(request: Request) {
  const settings = getAuthProvidersSettings();
  if (!settings.saml.enabled) {
    return NextResponse.json({ error: "SAML is disabled." }, { status: 404 });
  }
  const entryPoint = pickSsoValidationEntryPoint(settings);
  const missing = getMissingSamlConfig(settings, { requireEntryPoint: true });
  if (missing.length > 0 || !entryPoint) {
    return NextResponse.json(
      { error: `SAML is not configured. Missing: ${missing.join(", ")}.`, missing },
      { status: 400 }
    );
  }

  const publicOrigin = resolvePublicOrigin(request);
  const body = await request.formData();
  const samlResponse = body.get("SAMLResponse");
  const relayStateRaw = body.get("RelayState");
  const relayState =
    typeof relayStateRaw === "string" ? normalizeReturnTo(relayStateRaw) : "/";

  if (typeof samlResponse !== "string" || !samlResponse) {
    return NextResponse.json({ error: "Missing SAMLResponse payload." }, { status: 400 });
  }

  const responseEmbeddedCerts = extractCertificatesFromEncodedSamlResponse(samlResponse);
  let saml: Awaited<ReturnType<typeof createSamlClient>>;
  try {
    saml = await createSamlClient({
      origin: publicOrigin,
      settings,
      entryPoint,
      idpCertOverride: responseEmbeddedCerts.length > 0 ? responseEmbeddedCerts : undefined
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize SAML provider.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let profile: Profile | null = null;
  try {
    const result = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
      RelayState: relayState
    });
    profile = result.profile;
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAML response validation failed.";
    if (message.toLowerCase().includes("invalid signature") && isUnsignedFallbackAllowed(settings.saml.cert)) {
      const unsignedProfile = parseUnsignedSamlProfile(samlResponse);
      if (unsignedProfile) {
        profile = unsignedProfile;
      } else {
        return NextResponse.json({ error: message }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  if (!profile) {
    return NextResponse.json({ error: "No SAML profile was returned." }, { status: 401 });
  }

  const identity = resolveIdentity(profile, settings.saml.usernameAttribute);
  if (!identity.subject) {
    return NextResponse.json({ error: "SAML subject and username are missing." }, { status: 400 });
  }

  const fallbackUsername = identity.username || `saml_${identity.subject.slice(0, 10)}`;
  const fallbackEmail = identity.email || `${fallbackUsername}@local.invalid`;
  const parsedName = parseName(identity.displayName);

  let user = getUserByExternalIdentity("saml", identity.subject);
  if (!user && identity.username) {
    const byUsername = getUserByUsername(identity.username);
    if (byUsername) {
      user = updateUser(byUsername.id, {
        externalSubject: identity.subject,
        authProvider: "saml"
      });
    }
  }
  if (!user && identity.email) {
    const byEmail = getUserByEmail(identity.email);
    if (byEmail) {
      user = updateUser(byEmail.id, {
        externalSubject: identity.subject,
        authProvider: "saml"
      });
    }
  }
  if (!user && settings.saml.autoProvision) {
    user = createUser({
      username: fallbackUsername,
      firstName: parsedName.firstName,
      lastName: parsedName.lastName,
      email: fallbackEmail,
      avatarUrl: "",
      password: crypto.randomBytes(24).toString("hex"),
      role: "viewer",
      externalSubject: identity.subject,
      authProvider: "saml"
    });
  }
  if (!user) {
    return NextResponse.json({ error: "No local user mapped to this SAML account." }, { status: 403 });
  }

  const session = createSession(user.id);
  logAudit("auth.login", user.id, { username: user.username, method: "saml" });
  const response = NextResponse.redirect(new URL(relayState, publicOrigin));
  response.cookies.set("pulze_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
