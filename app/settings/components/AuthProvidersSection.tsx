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
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Access</p>
            <h2 className="text-2xl font-semibold">Authentication Providers</h2>
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
            <h3 className="text-lg font-semibold">OIDC</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={authDraft.oidc.enabled}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    oidc: { ...prev.oidc, enabled: event.target.checked }
                  }))
                }
              />
              Enabled
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={authDraft.oidc.issuerUrl}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, issuerUrl: event.target.value }
                }))
              }
              placeholder="Issuer URL"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.authorizationEndpoint}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, authorizationEndpoint: event.target.value }
                }))
              }
              placeholder="Authorization endpoint"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.tokenEndpoint}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, tokenEndpoint: event.target.value }
                }))
              }
              placeholder="Token endpoint"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.userinfoEndpoint}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, userinfoEndpoint: event.target.value }
                }))
              }
              placeholder="Userinfo endpoint"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.clientId}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, clientId: event.target.value }
                }))
              }
              placeholder="Client ID"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.clientSecret}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, clientSecret: event.target.value }
                }))
              }
              placeholder="Client secret"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.oidc.scopes}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, scopes: event.target.value }
                }))
              }
              placeholder="Scopes"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={authDraft.oidc.autoProvision}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    oidc: { ...prev.oidc, autoProvision: event.target.checked }
                  }))
                }
              />
              Auto-provision users
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-base/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">SAML</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={authDraft.saml.enabled}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, enabled: event.target.checked }
                  }))
                }
              />
              Enabled
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            SAML config is stored and exposed in login options. Full assertion validation flow is not active in this build.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={authDraft.saml.entryPoint}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, entryPoint: event.target.value }
                }))
              }
              placeholder="IdP entry point"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
            <input
              value={authDraft.saml.issuer}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, issuer: event.target.value }
                }))
              }
              placeholder="Service provider issuer"
              className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

