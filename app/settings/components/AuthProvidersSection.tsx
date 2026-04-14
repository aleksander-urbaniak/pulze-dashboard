import { useState } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCertificate,
  faGear,
  faLink,
  faRightToBracket,
  faSave,
  faShieldHalved,
  faSignature,
  faToggleOff,
  faToggleOn,
  faUser
} from "@fortawesome/free-solid-svg-icons";

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
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <section className="space-y-6 p-2 lg:p-0">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5 shrink-0 text-accent" />
            <h2 className="text-[2.2rem] font-semibold leading-none text-text">SAML Authentication</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button type="button" onClick={onSave} className={settingsPrimaryButton}>
              <FontAwesomeIcon icon={faSave} className="mr-2 h-3.5 w-3.5" />
              Save Changes
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Configure SSO and access controls with the same settings visual system.
        </p>
      </div>

      <div className={clsx(settingsShellCard, "p-5 lg:p-6")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-text leading-none">Authentication Provider</h3>
            <p className="mt-2 text-sm text-slate-400">SAML SSO configuration</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
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

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#22395c] bg-[#091425] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-accent/35 hover:text-accent"
        >
          <FontAwesomeIcon icon={faGear} className="h-4 w-4" />
          {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
        </button>

        {showAdvanced ? (
          <div className="mt-4 rounded-xl border border-[#1d2f4c] bg-[#061122] p-4">
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200"
              >
                <FontAwesomeIcon
                  icon={authDraft.saml.enabled ? faToggleOn : faToggleOff}
                  className={clsx("h-5 w-5", authDraft.saml.enabled ? "text-accent" : "text-slate-500")}
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200"
              >
                <FontAwesomeIcon
                  icon={authDraft.saml.autoProvision ? faToggleOn : faToggleOff}
                  className={clsx(
                    "h-5 w-5",
                    authDraft.saml.autoProvision ? "text-accent" : "text-slate-500"
                  )}
                />
                Auto-provision users
              </button>
            </div>
          </div>
        ) : null}

        {authStatus ? <p className="mt-4 text-sm text-slate-300">{authStatus}</p> : null}
      </div>
    </section>
  );
}
