import { SAML, ValidateInResponseTo } from "@node-saml/node-saml";

import {
  getAuthProvidersSettings,
  getSamlRequestCache,
  removeSamlRequestCache,
  saveSamlRequestCache
} from "../../../../../lib/db";

type SsoStartMode = "redirect" | "post" | "idp-init";

const UNSAFE_FALLBACK_CERT = "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----";
const SAML_REQUEST_TTL_MS = 8 * 60 * 60 * 1000;

const samlCacheProvider = {
  async saveAsync(key: string, value: string) {
    const createdAt = Date.now();
    saveSamlRequestCache(key, value, createdAt + SAML_REQUEST_TTL_MS);
    return { value, createdAt };
  },
  async getAsync(key: string) {
    return getSamlRequestCache(key);
  },
  async removeAsync(key: string | null) {
    return removeSamlRequestCache(key);
  }
};

function normalizeBase64Certificate(value: string) {
  const compact = value.replace(/\s+/g, "");
  const wrapped = compact.match(/.{1,64}/g)?.join("\n") ?? compact;
  return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----`;
}

function extractCertificatesFromXml(xml: string) {
  const certMatches = [
    ...xml.matchAll(
      /<(?:[A-Za-z0-9_-]+:)?X509Certificate\b[^>]*>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?X509Certificate>/gi
    )
  ]
    .map((match) => match[1]?.trim() ?? "")
    .filter(Boolean);
  return certMatches.map(normalizeBase64Certificate);
}

function extractCertificatesFromMetadata(xml: string) {
  return extractCertificatesFromXml(xml);
}

export function extractCertificatesFromEncodedSamlResponse(samlResponse: string) {
  try {
    const xml = Buffer.from(samlResponse, "base64").toString("utf8");
    return extractCertificatesFromXml(xml);
  } catch {
    return [];
  }
}

function looksLikeBase64Certificate(value: string) {
  return /^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.replace(/\s+/g, "").length > 128;
}

function normalizeCertificateText(raw: string) {
  const value = raw.trim();
  if (value.includes("BEGIN CERTIFICATE") || value.includes("BEGIN PUBLIC KEY")) {
    return value;
  }

  const metadataCerts = extractCertificatesFromMetadata(value);
  if (metadataCerts.length > 0) {
    return metadataCerts;
  }

  if (looksLikeBase64Certificate(value)) {
    return normalizeBase64Certificate(value);
  }

  if (/<(?:[A-Za-z0-9_-]+:)?EntityDescriptor\b/i.test(value)) {
    throw new Error(
      "SAML metadata was loaded, but it contains no X509 signing certificate. In Authentik, set a Signing Certificate for the SAML provider and use that cert (or a URL that returns the cert)."
    );
  }

  throw new Error("Unsupported IdP certificate value. Provide PEM/base64 cert or metadata XML.");
}

export function pickSsoStart(settings: ReturnType<typeof getAuthProvidersSettings>) {
  const redirect = settings.saml.ssoUrlRedirect.trim();
  const post = settings.saml.ssoUrlPost.trim();
  const legacy = settings.saml.entryPoint.trim();
  const idpInit = settings.saml.ssoUrlIdpInitiated.trim();
  if (redirect) {
    return { mode: "redirect" as SsoStartMode, endpoint: redirect };
  }
  if (post) {
    return { mode: "post" as SsoStartMode, endpoint: post };
  }
  if (legacy) {
    return { mode: "redirect" as SsoStartMode, endpoint: legacy };
  }
  if (idpInit) {
    return { mode: "idp-init" as SsoStartMode, endpoint: idpInit };
  }
  return null;
}

export function pickSsoValidationEntryPoint(settings: ReturnType<typeof getAuthProvidersSettings>) {
  return (
    settings.saml.ssoUrlRedirect.trim() ||
    settings.saml.ssoUrlPost.trim() ||
    settings.saml.entryPoint.trim() ||
    settings.saml.ssoUrlIdpInitiated.trim()
  );
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return "";
  }
}

export function resolvePublicOrigin(request: Request) {
  const configuredOrigin = normalizeOrigin(
    process.env.APP_BASE_URL ??
      process.env.PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      ""
  );
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  const host = forwardedHost || request.headers.get("host") || url.host;
  const proto = forwardedProto || url.protocol.replace(":", "");

  if (!host) {
    return url.origin;
  }

  return `${proto}://${host}`;
}

export function getMissingSamlConfig(
  settings: ReturnType<typeof getAuthProvidersSettings>,
  options?: { requireEntryPoint?: boolean }
) {
  const missing: string[] = [];
  if (!settings.saml.idpIssuer.trim()) {
    missing.push("IdP entity ID");
  }
  if (!settings.saml.issuer.trim()) {
    missing.push("SP entity ID");
  }
  if (!settings.saml.usernameAttribute.trim()) {
    missing.push("Username attribute");
  }
  if (options?.requireEntryPoint && !pickSsoValidationEntryPoint(settings)) {
    missing.push("SSO service URL");
  }
  return missing;
}

function toMetadataUrlFromSsoUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname || "/";
    const ssoIndex = path.indexOf("/sso/");
    if (ssoIndex >= 0) {
      parsed.pathname = `${path.slice(0, ssoIndex)}/metadata/`;
    } else {
      parsed.pathname = `${path.replace(/\/+$/, "")}/metadata/`;
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function metadataCandidates(settings: ReturnType<typeof getAuthProvidersSettings>) {
  const rawCandidates = [
    settings.saml.ssoUrlRedirect,
    settings.saml.ssoUrlPost,
    settings.saml.entryPoint,
    settings.saml.ssoUrlIdpInitiated
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => [value, toMetadataUrlFromSsoUrl(value)])
    .filter(Boolean);

  return Array.from(new Set(rawCandidates));
}

async function resolveFromUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch IdP certificate URL (${response.status}).`);
  }
  const body = (await response.text()).trim();
  if (!body) {
    throw new Error("IdP certificate URL returned an empty response.");
  }
  return normalizeCertificateText(body);
}

export async function resolveIdpCert(
  rawValue: string,
  options?: { metadataUrls?: string[]; allowUnsafeFallback?: boolean }
) {
  const value = rawValue.trim();
  const metadataUrls = options?.metadataUrls ?? [];
  const allowUnsafeFallback = options?.allowUnsafeFallback !== false;

  if (value) {
    if (!/^https?:\/\//i.test(value)) {
      return normalizeCertificateText(value);
    }
    return resolveFromUrl(value);
  }

  for (const url of metadataUrls) {
    try {
      return await resolveFromUrl(url);
    } catch {
      // Try next discovered metadata candidate.
    }
  }

  if (allowUnsafeFallback) {
    return UNSAFE_FALLBACK_CERT;
  }

  if (metadataUrls.length > 0) {
    throw new Error(
      "Unable to resolve IdP signing certificate from SSO/metadata URLs. Configure a signing certificate in IdP metadata or set an explicit cert URL."
    );
  }

  throw new Error("Unable to resolve IdP signing certificate.");
}

export async function createSamlClient(params: {
  origin: string;
  settings: ReturnType<typeof getAuthProvidersSettings>;
  entryPoint: string;
  mode?: SsoStartMode;
  idpCertOverride?: string | string[];
}) {
  const { origin, settings, entryPoint, mode, idpCertOverride } = params;
  const resolvedIdpCert =
    idpCertOverride ??
    (await resolveIdpCert(settings.saml.cert, {
      metadataUrls: metadataCandidates(settings),
      allowUnsafeFallback: true
    }));
  return new SAML({
    callbackUrl: `${origin}/api/auth/sso/saml/callback`,
    entryPoint,
    logoutUrl: settings.saml.sloUrlRedirect || settings.saml.sloUrlPost || undefined,
    issuer: settings.saml.issuer,
    audience: settings.saml.issuer,
    identifierFormat: settings.saml.spNameIdFormat || undefined,
    idpIssuer: settings.saml.idpIssuer || undefined,
    idpCert: resolvedIdpCert,
    wantAuthnResponseSigned: false,
    wantAssertionsSigned: false,
    signatureAlgorithm: "sha256",
    validateInResponseTo: ValidateInResponseTo.ifPresent,
    requestIdExpirationPeriodMs: SAML_REQUEST_TTL_MS,
    cacheProvider: samlCacheProvider,
    authnRequestBinding: mode === "post" ? "HTTP-POST" : undefined
  });
}
