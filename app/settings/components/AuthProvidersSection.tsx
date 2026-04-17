import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCertificate,
  faLink,
  faRightToBracket,
  faSave,
  faShieldHalved,
  faSignature,
  faToggleOff,
  faToggleOn,
  faUser
} from "@fortawesome/free-solid-svg-icons";

import PageSectionHeader from "../../../components/PageSectionHeader";
import type { AuthProvidersSettings } from "../../../lib/types";
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsPanelCard,
  settingsShellCard,
  settingsPrimaryButton
} from "./theme";

type AuthProvidersSectionProps = {
  headerRight?: React.ReactNode;
  authDraft: AuthProvidersSettings;
  setAuthDraft: React.Dispatch<React.SetStateAction<AuthProvidersSettings>>;
  authStatus: string | null;
  onSave: () => void;
};

function Field({
  label,
  icon,
  children
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className={settingsLabelClass}>{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}

export default function AuthProvidersSection({
  headerRight,
  authDraft,
  setAuthDraft,
  authStatus,
  onSave
}: AuthProvidersSectionProps) {
  return (
    <section className="space-y-4">
      <PageSectionHeader
        icon={faShieldHalved}
        title="SSO & Access"
        subtitle="Configure SSO and access controls with the same settings visual system."
        right={headerRight}
      />

      <div className={clsx(settingsShellCard, "p-5 lg:p-6")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-text leading-none">Authentication Provider</h3>
            <p className="mt-2 text-sm text-muted">SAML SSO configuration</p>
          </div>
          <div
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 py-2",
              authDraft.saml.enabled
                ? "border border-emerald-500/20 bg-emerald-500/10"
                : "border border-rose-500/25 bg-rose-500/10"
            )}
          >
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                authDraft.saml.enabled ? "bg-emerald-400" : "bg-rose-400"
              )}
            />
            <span
              className={clsx(
                "text-[10px] font-bold uppercase tracking-[0.18em]",
                authDraft.saml.enabled ? "text-emerald-400" : "text-rose-300"
              )}
            >
              {authDraft.saml.enabled ? "Configured" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display Name" icon={<FontAwesomeIcon icon={faBuilding} className="h-4 w-4" />}>
            <input
              value={authDraft.saml.idpIssuer}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, idpIssuer: event.target.value }
                }))
              }
              placeholder="authentik"
              className={clsx(settingsFieldClass, "pl-11")}
            />
          </Field>

          <Field label="Issuer URL" icon={<FontAwesomeIcon icon={faLink} className="h-4 w-4" />}>
            <input
              value={authDraft.saml.ssoUrlRedirect}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, ssoUrlRedirect: event.target.value }
                }))
              }
              placeholder="https://idp.example.com/saml"
              className={clsx(settingsFieldClass, "pl-11")}
            />
          </Field>

          <Field label="Entity ID (SP Issuer)" icon={<FontAwesomeIcon icon={faSignature} className="h-4 w-4" />}>
            <input
              value={authDraft.saml.issuer}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, issuer: event.target.value }
                }))
              }
              placeholder="urn:pulze:sso:provider"
              className={clsx(settingsFieldClass, "pl-11")}
            />
          </Field>

          <Field label="Redirect URI (ACS)" icon={<FontAwesomeIcon icon={faRightToBracket} className="h-4 w-4" />}>
            <input
              value={authDraft.saml.ssoUrlPost}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, ssoUrlPost: event.target.value }
                }))
              }
              placeholder="/api/auth/sso/saml/callback"
              className={clsx(settingsFieldClass, "pl-11")}
            />
          </Field>

          <Field label="Username Attribute" icon={<FontAwesomeIcon icon={faUser} className="h-4 w-4" />}>
            <input
              value={authDraft.saml.usernameAttribute}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, usernameAttribute: event.target.value }
                }))
              }
              placeholder="username"
              className={clsx(settingsFieldClass, "pl-11")}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Signing Certificate" icon={<FontAwesomeIcon icon={faCertificate} className="h-4 w-4" />}>
            <textarea
              value={authDraft.saml.cert}
              onChange={(event) =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, cert: event.target.value }
                }))
              }
              placeholder="-----BEGIN CERTIFICATE-----"
              className={clsx(settingsFieldClass, "min-h-[110px] pl-11")}
            />
          </Field>
        </div>

        <div className="mt-4 p-0">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Entry Point" icon={<FontAwesomeIcon icon={faLink} className="h-4 w-4" />}>
              <input
                value={authDraft.saml.entryPoint}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, entryPoint: event.target.value }
                  }))
                }
                className={clsx(settingsFieldClass, "pl-11")}
              />
            </Field>

            <Field label="SP NameID Format" icon={<FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />}>
              <input
                value={authDraft.saml.spNameIdFormat}
                onChange={(event) =>
                  setAuthDraft((prev) => ({
                    ...prev,
                    saml: { ...prev.saml, spNameIdFormat: event.target.value }
                  }))
                }
                className={clsx(settingsFieldClass, "pl-11")}
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                setAuthDraft((prev) => ({
                  ...prev,
                  oidc: { ...prev.oidc, enabled: false },
                  saml: { ...prev.saml, enabled: !prev.saml.enabled }
                }))
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-text"
            >
              <FontAwesomeIcon
                icon={authDraft.saml.enabled ? faToggleOn : faToggleOff}
                className={clsx("h-5 w-5", authDraft.saml.enabled ? "text-accent" : "text-muted")}
              />
              Enable SAML SSO
            </button>

            <button
              type="button"
              onClick={() =>
                setAuthDraft((prev) => ({
                  ...prev,
                  saml: { ...prev.saml, autoProvision: !prev.saml.autoProvision }
                }))
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-text"
            >
              <FontAwesomeIcon
                icon={authDraft.saml.autoProvision ? faToggleOn : faToggleOff}
                className={clsx(
                  "h-5 w-5",
                  authDraft.saml.autoProvision ? "text-accent" : "text-muted"
                )}
              />
              Auto-provision users
            </button>
          </div>
        </div>

        {authStatus ? <p className="mt-4 text-sm text-muted">{authStatus}</p> : null}
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={onSave} className={settingsPrimaryButton}>
          <FontAwesomeIcon icon={faSave} className="mr-2 h-3.5 w-3.5" />
          Save Changes
        </button>
      </div>
    </section>
  );
}
