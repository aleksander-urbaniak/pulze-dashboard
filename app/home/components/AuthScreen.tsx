import ThemeToggle from "../../../components/ThemeToggle";

type LoginForm = {
  username: string;
  password: string;
};

type SetupForm = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  avatarUrl: string;
  password: string;
};

type AuthScreenProps = {
  needsSetup: boolean;
  isCheckingSetup: boolean;
  loginForm: LoginForm;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  loginTotpCode: string;
  setLoginTotpCode: React.Dispatch<React.SetStateAction<string>>;
  isTwoFactorStep: boolean;
  onCancelTwoFactor: () => void;
  setupForm: SetupForm;
  setSetupForm: React.Dispatch<React.SetStateAction<SetupForm>>;
  loginError: string | null;
  setupError: string | null;
  ssoProviders: { oidc: boolean; saml: boolean };
  onLoginSubmit: (event: React.FormEvent) => void;
  onSetupSubmit: (event: React.FormEvent) => void;
};

export default function AuthScreen({
  needsSetup,
  isCheckingSetup,
  loginForm,
  setLoginForm,
  loginTotpCode,
  setLoginTotpCode,
  isTwoFactorStep,
  onCancelTwoFactor,
  setupForm,
  setSetupForm,
  loginError,
  setupError,
  ssoProviders,
  onLoginSubmit,
  onSetupSubmit
}: AuthScreenProps) {
  const isSetupView = needsSetup && !isCheckingSetup;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6">
      <div
        className={`w-full rounded-3xl border border-border bg-surface/90 shadow-card backdrop-blur ${
          isSetupView ? "max-w-4xl p-6 sm:p-10" : "max-w-md p-5 sm:p-7"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3">
            <span className="brand-logo flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface/90 shadow-card">
              <span className="brand-logo__image" />
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="brand-logo__fallback">
                <path
                  d="M4 16h6l3-6 6 12 3-6h6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted">PulZe</p>
              <h1 className={`font-semibold ${isSetupView ? "text-3xl" : "text-2xl"}`}>
                {needsSetup ? "Welcome to PulZe" : "Monitoring Login"}
              </h1>
              {!isSetupView ? (
                <p className="mt-2 text-sm text-muted">Sign in to continue monitoring.</p>
              ) : null}
            </div>
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-4 flex justify-end sm:hidden">
          <ThemeToggle />
        </div>

        {isCheckingSetup ? (
          <p className="mt-6 text-sm text-muted">Checking setup status...</p>
        ) : needsSetup ? (
          <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Overview</p>
              <h2 className="mt-2 text-2xl font-semibold">Unified monitoring in one place</h2>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li>Aggregate alerts from Prometheus, Zabbix, and Uptime Kuma.</li>
                <li>Filter, search, and refresh automatically on the dashboard.</li>
                <li>Manage users, permissions, and data sources centrally.</li>
              </ul>
              <div className="mt-6 rounded-2xl border border-border bg-base/50 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Setup checklist</p>
                <ol className="mt-4 space-y-2 text-sm text-muted">
                  <li className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                      1
                    </span>
                    Create your admin account.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                      2
                    </span>
                    Connect data sources in Settings.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                      3
                    </span>
                    Invite teammates and assign roles.
                  </li>
                </ol>
              </div>
              <div className="mt-6">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Data source guides</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-base/50 p-4">
                    <p className="text-sm font-semibold">Prometheus + Alertmanager</p>
                    <p className="mt-2 text-xs text-muted">
                      Add the base URL, and PulZe will pull `/api/v2/alerts`.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-base/50 p-4">
                    <p className="text-sm font-semibold">Zabbix</p>
                    <p className="mt-2 text-xs text-muted">
                      Use the base URL and API token for JSON-RPC access.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-base/50 p-4 sm:col-span-2">
                    <p className="text-sm font-semibold">Uptime Kuma</p>
                    <p className="mt-2 text-xs text-muted">
                      Choose status page mode or API key mode and provide the slug.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <form onSubmit={onSetupSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={setupForm.firstName}
                  onChange={(event) =>
                    setSetupForm({ ...setupForm, firstName: event.target.value })
                  }
                  placeholder="First name"
                  className="rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
                <input
                  value={setupForm.lastName}
                  onChange={(event) =>
                    setSetupForm({ ...setupForm, lastName: event.target.value })
                  }
                  placeholder="Last name"
                  className="rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
                />
              </div>
              <input
                value={setupForm.username}
                onChange={(event) => setSetupForm({ ...setupForm, username: event.target.value })}
                placeholder="Username"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
              />
              <input
                value={setupForm.email}
                onChange={(event) => setSetupForm({ ...setupForm, email: event.target.value })}
                placeholder="Email"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
              />
              <input
                value={setupForm.avatarUrl}
                onChange={(event) =>
                  setSetupForm({ ...setupForm, avatarUrl: event.target.value })
                }
                placeholder="Avatar URL (optional)"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
              />
              <input
                type="password"
                value={setupForm.password}
                onChange={(event) => setSetupForm({ ...setupForm, password: event.target.value })}
                placeholder="Password"
                className="w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm"
              />
              {setupError ? <p className="text-sm text-red-500">{setupError}</p> : null}
              <button
                type="submit"
                className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-card"
              >
                Create Admin Account
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={onLoginSubmit} className="mt-6 space-y-4">
            {!isTwoFactorStep ? (
              <>
                <div>
                  <label htmlFor="login-username" className="text-xs uppercase tracking-[0.2em] text-muted">
                    Username
                  </label>
                  <input
                    id="login-username"
                    name="username"
                    value={loginForm.username}
                    onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="mt-2 w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="text-xs uppercase tracking-[0.2em] text-muted">
                    Password
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="login-totp" className="text-xs uppercase tracking-[0.2em] text-muted">
                  2FA code
                </label>
                <input
                  id="login-totp"
                  name="totp"
                  value={loginTotpCode}
                  onChange={(event) => setLoginTotpCode(event.target.value)}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-xl border border-border bg-base/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            )}
            {loginError ? <p className="text-sm text-red-500">{loginError}</p> : null}
            <button
              type="submit"
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white shadow-card"
            >
              {isTwoFactorStep ? "Verify Code" : "Sign In"}
            </button>
            {isTwoFactorStep ? (
              <button
                type="button"
                onClick={onCancelTwoFactor}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold"
              >
                Use another account
              </button>
            ) : null}
            {!isTwoFactorStep && (ssoProviders.oidc || ssoProviders.saml) ? (
              <div className="space-y-2">
                {ssoProviders.oidc ? (
                  <a
                    href="/api/auth/sso/oidc/start"
                    className="block w-full rounded-xl border border-border bg-base/60 py-3 text-center text-sm font-semibold"
                  >
                    Continue with OIDC SSO
                  </a>
                ) : null}
                {ssoProviders.saml ? (
                  <p className="rounded-xl border border-border bg-base/60 py-3 text-center text-sm font-semibold text-muted">
                    SAML SSO configured for this environment
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
