import { useState } from "react";

import type { AuthProvidersSettings } from "../../../lib/types";

type AuthProvidersSectionProps = {
  authDraft: AuthProvidersSettings;
  setAuthDraft: React.Dispatch<React.SetStateAction<AuthProvidersSettings>>;
  authStatus: string | null;
  onSave: () => void;
};

export default function AuthProvidersSection({
  authDraft,
  setAuthDraft,
  authStatus,
  onSave
}: AuthProvidersSectionProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Access</p>
            <h2 className="text-2xl font-semibold">SAML Authentication</h2>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-accent px-4 py-2 text-xs uppercase tracking-[0.2em] text-white"
          >
            Save
          </button>
        </div>
        {authStatus ? <p className="mt-3 text-sm text-muted">{authStatus}</p> : null}

        <div className="mt-6 rounded-2xl border border-border bg-base/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">SAML Provider</h3>
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-base/60 text-xs font-semibold"
                aria-label="SAML setup help"
                title="SAML setup help"
              >
                ?
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={authDraft.saml.enabled}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    oidc: { ...prev.oidc, enabled: false },
                    saml: { ...prev.saml, enabled: event.target.checked }
                  }))
                }
              />
              Enabled
            </label>
          </div>
          {showHelp ? (
            <div className="mt-3 rounded-xl border border-border bg-base/60 p-3 text-xs text-muted">
              <p className="font-semibold text-text">How to set up SAML (any IdP)</p>
              <p className="mt-2">
                1. In your IdP, create a SAML app and set ACS URL to
                <code> https://your-domain/api/auth/sso/saml/callback </code>
                and Audience/Entity ID to the same value you put in SP entity ID below.
              </p>
              <p className="mt-2">
                2. Copy IdP metadata values into this form:
                IdP entity ID, SSO URL, optional SLO URL, and username attribute claim.
              </p>
              <p className="mt-2">
                3. Common username attribute examples:
                <code> username </code>, <code> email </code>,
                <code> http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name </code>,
                <code> http://schemas.goauthentik.io/2021/02/saml/username </code>.
              </p>
              <p className="mt-2">
                4. Keep SP name ID format as
                <code> urn:oasis:names:tc:SAML:2.0:nameid-format:transient </code>
                unless your IdP requires a different format.
              </p>
              <p className="mt-2">
                Works with Authentik, Keycloak, Okta, Entra ID (Azure AD), OneLogin, and similar
                SAML providers.
              </p>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            ACS URL: <code>/api/auth/sso/saml/callback</code>
          </p>
          <p className="mt-1 text-xs text-muted">
            For Authentik, username attribute is usually{" "}
            <code>http://schemas.goauthentik.io/2021/02/saml/username</code>.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">IdP entity ID</p>
              <input
                value={authDraft.saml.idpIssuer}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, idpIssuer: event.target.value }
                  }))
                }
                placeholder="e.g. authentik"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">SSO service URL</p>
              <input
                value={authDraft.saml.ssoUrlRedirect}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, ssoUrlRedirect: event.target.value }
                  }))
                }
                placeholder=".../sso/binding/redirect/"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">
                SLO service URL (optional)
              </p>
              <input
                value={authDraft.saml.sloUrlRedirect}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, sloUrlRedirect: event.target.value }
                  }))
                }
                placeholder=".../slo/binding/redirect/"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Username attribute</p>
              <input
                value={authDraft.saml.usernameAttribute}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, usernameAttribute: event.target.value }
                  }))
                }
                placeholder="http://schemas.goauthentik.io/2021/02/saml/username"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">SP entity ID</p>
              <input
                value={authDraft.saml.issuer}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, issuer: event.target.value }
                  }))
                }
                placeholder="e.g. pulze"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">SP name ID format</p>
              <input
                value={authDraft.saml.spNameIdFormat}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, spNameIdFormat: event.target.value }
                  }))
                }
                placeholder="urn:oasis:names:tc:SAML:2.0:nameid-format:transient"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
              />
            </label>
            <p className="text-xs text-muted md:col-span-2">
              IdP signing certificate is discovered automatically from metadata or the SAML response.
            </p>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={authDraft.saml.autoProvision}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, autoProvision: event.target.checked }
                  }))
                }
              />
              Auto-provision new SAML users as viewer
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
