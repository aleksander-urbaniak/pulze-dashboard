import clsx from "clsx";

import type { KumaSource, PrometheusSource, Settings, ZabbixSource } from "../../../lib/types";
import type { TestState } from "../types";

type DataSourcesSectionProps = {
  settingsDraft: Settings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<Settings>>;
  canEditSettings: boolean;
  hasInvalidLabels: boolean;
  settingsStatus: string | null;
  testResults: Record<string, TestState>;
  onSave: () => void;
  createPrometheusSource: () => PrometheusSource;
  createZabbixSource: () => ZabbixSource;
  createKumaSource: () => KumaSource;
  updatePrometheusSource: (id: string, updates: Partial<PrometheusSource>) => void;
  updateZabbixSource: (id: string, updates: Partial<ZabbixSource>) => void;
  updateKumaSource: (id: string, updates: Partial<KumaSource>) => void;
  testSource: (
    type: "Prometheus" | "Zabbix" | "Kuma",
    source: PrometheusSource | ZabbixSource | KumaSource
  ) => void;
  testKey: (type: "Prometheus" | "Zabbix" | "Kuma", id: string) => string;
};

export default function DataSourcesSection({
  settingsDraft,
  setSettingsDraft,
  canEditSettings,
  hasInvalidLabels,
  settingsStatus,
  testResults,
  onSave,
  createPrometheusSource,
  createZabbixSource,
  createKumaSource,
  updatePrometheusSource,
  updateZabbixSource,
  updateKumaSource,
  testSource,
  testKey
}: DataSourcesSectionProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Data Sources</p>
              <h2 className="text-2xl font-semibold">Alert Fetch Settings</h2>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={!canEditSettings || hasInvalidLabels}
              className={clsx(
                "rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em]",
                canEditSettings ? "bg-accent text-white" : "border border-border text-muted"
              )}
            >
              Save
            </button>
          </div>
          {settingsStatus ? <p className="mt-3 text-sm text-muted">{settingsStatus}</p> : null}
          {hasInvalidLabels ? (
            <p className="mt-2 text-sm text-red-500">
              Every monitoring source needs a label before saving.
            </p>
          ) : null}

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-border bg-base/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Prometheus / Alertmanager</h3>
                  <p className="text-xs text-muted">Add as many Alertmanager endpoints as needed.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      prometheusSources: [...prev.prometheusSources, createPrometheusSource()]
                    }))
                  }
                  disabled={!canEditSettings}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {settingsDraft.prometheusSources.length === 0 ? (
                  <p className="text-sm text-muted">No Prometheus sources added yet.</p>
                ) : (
                  settingsDraft.prometheusSources.map((source) => {
                    const isMissingLabel = Boolean(source.url) && !source.name.trim();
                    return (
                      <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <input
                            value={source.name}
                            onChange={(event) =>
                              updatePrometheusSource(source.id, { name: event.target.value })
                            }
                            placeholder="Label (required)"
                            disabled={!canEditSettings}
                            className={clsx(
                              "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                              isMissingLabel ? "border-red-500" : "border-border"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => testSource("Prometheus", source)}
                              disabled={!canEditSettings || !source.url}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSettingsDraft((prev) => ({
                                  ...prev,
                                  prometheusSources: prev.prometheusSources.filter(
                                    (entry) => entry.id !== source.id
                                  )
                                }))
                              }
                              disabled={!canEditSettings}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <input
                            value={source.url}
                            onChange={(event) =>
                              updatePrometheusSource(source.id, { url: event.target.value })
                            }
                            placeholder="https://alertmanager.example.com"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <select
                            value={source.authType}
                            onChange={(event) =>
                              updatePrometheusSource(source.id, {
                                authType: event.target.value as PrometheusSource["authType"]
                              })
                            }
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          >
                            <option value="none">No auth</option>
                            <option value="basic">Basic (user:pass)</option>
                            <option value="bearer">Bearer token</option>
                          </select>
                          <input
                            value={source.authValue}
                            onChange={(event) =>
                              updatePrometheusSource(source.id, { authValue: event.target.value })
                            }
                            placeholder="user:password or token"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm md:col-span-2"
                          />
                        </div>
                        {testResults[testKey("Prometheus", source.id)] ? (
                          <div
                            className={clsx(
                              "mt-3 rounded-xl border px-3 py-2 text-xs",
                              testResults[testKey("Prometheus", source.id)].status === "error"
                                ? "border-red-500/40 bg-red-500/10 text-red-500"
                                : "border-border bg-base/50 text-muted"
                            )}
                          >
                            <p className="font-semibold">
                              {testResults[testKey("Prometheus", source.id)].message}
                            </p>
                            {testResults[testKey("Prometheus", source.id)].sampleLine ? (
                              <p className="mt-1 font-mono text-muted">
                                Sample: {testResults[testKey("Prometheus", source.id)].sampleLine}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-base/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Zabbix</h3>
                  <p className="text-xs text-muted">Support multiple Zabbix instances.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      zabbixSources: [...prev.zabbixSources, createZabbixSource()]
                    }))
                  }
                  disabled={!canEditSettings}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {settingsDraft.zabbixSources.length === 0 ? (
                  <p className="text-sm text-muted">No Zabbix sources added yet.</p>
                ) : (
                  settingsDraft.zabbixSources.map((source) => {
                    const isMissingLabel = Boolean(source.url) && !source.name.trim();
                    return (
                      <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <input
                            value={source.name}
                            onChange={(event) =>
                              updateZabbixSource(source.id, { name: event.target.value })
                            }
                            placeholder="Label (required)"
                            disabled={!canEditSettings}
                            className={clsx(
                              "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                              isMissingLabel ? "border-red-500" : "border-border"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => testSource("Zabbix", source)}
                              disabled={!canEditSettings || !source.url}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSettingsDraft((prev) => ({
                                  ...prev,
                                  zabbixSources: prev.zabbixSources.filter(
                                    (entry) => entry.id !== source.id
                                  )
                                }))
                              }
                              disabled={!canEditSettings}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <input
                            value={source.url}
                            onChange={(event) =>
                              updateZabbixSource(source.id, { url: event.target.value })
                            }
                            placeholder="https://zabbix.example.com"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={source.token}
                            onChange={(event) =>
                              updateZabbixSource(source.id, { token: event.target.value })
                            }
                            placeholder="API token"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                        </div>
                        {testResults[testKey("Zabbix", source.id)] ? (
                          <div
                            className={clsx(
                              "mt-3 rounded-xl border px-3 py-2 text-xs",
                              testResults[testKey("Zabbix", source.id)].status === "error"
                                ? "border-red-500/40 bg-red-500/10 text-red-500"
                                : "border-border bg-base/50 text-muted"
                            )}
                          >
                            <p className="font-semibold">
                              {testResults[testKey("Zabbix", source.id)].message}
                            </p>
                            {testResults[testKey("Zabbix", source.id)].sampleLine ? (
                              <p className="mt-1 font-mono text-muted">
                                Sample: {testResults[testKey("Zabbix", source.id)].sampleLine}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-base/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Uptime Kuma</h3>
                  <p className="text-xs text-muted">Track multiple Kuma instances.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsDraft((prev) => ({
                      ...prev,
                      kumaSources: [...prev.kumaSources, createKumaSource()]
                    }))
                  }
                  disabled={!canEditSettings}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                >
                  Add
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {settingsDraft.kumaSources.length === 0 ? (
                  <p className="text-sm text-muted">No Kuma sources added yet.</p>
                ) : (
                  settingsDraft.kumaSources.map((source) => {
                    const isMissingLabel = Boolean(source.baseUrl) && !source.name.trim();
                    return (
                      <div key={source.id} className="rounded-2xl border border-border bg-surface/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <input
                            value={source.name}
                            onChange={(event) =>
                              updateKumaSource(source.id, { name: event.target.value })
                            }
                            placeholder="Label (required)"
                            disabled={!canEditSettings}
                            className={clsx(
                              "rounded-xl border bg-base/60 px-3 py-2 text-sm",
                              isMissingLabel ? "border-red-500" : "border-border"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => testSource("Kuma", source)}
                              disabled={
                                !canEditSettings ||
                                !source.baseUrl ||
                                (source.mode === "status" && !source.slug)
                              }
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSettingsDraft((prev) => ({
                                  ...prev,
                                  kumaSources: prev.kumaSources.filter((entry) => entry.id !== source.id)
                                }))
                              }
                              disabled={!canEditSettings}
                              className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <input
                            value={source.baseUrl}
                            onChange={(event) =>
                              updateKumaSource(source.id, { baseUrl: event.target.value })
                            }
                            placeholder="https://kuma.example.com"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <select
                            value={source.mode}
                            onChange={(event) =>
                              updateKumaSource(source.id, {
                                mode: event.target.value as KumaSource["mode"]
                              })
                            }
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          >
                            <option value="status">Status page</option>
                            <option value="apiKey">API key</option>
                          </select>
                          <input
                            value={source.slug}
                            onChange={(event) =>
                              updateKumaSource(source.id, { slug: event.target.value })
                            }
                            placeholder="Status page slug"
                            disabled={!canEditSettings || source.mode !== "status"}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                          <input
                            value={source.key}
                            onChange={(event) =>
                              updateKumaSource(source.id, { key: event.target.value })
                            }
                            placeholder="API key"
                            disabled={!canEditSettings}
                            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                          />
                        </div>
                        {testResults[testKey("Kuma", source.id)] ? (
                          <div
                            className={clsx(
                              "mt-3 rounded-xl border px-3 py-2 text-xs",
                              testResults[testKey("Kuma", source.id)].status === "error"
                                ? "border-red-500/40 bg-red-500/10 text-red-500"
                                : "border-border bg-base/50 text-muted"
                            )}
                          >
                            <p className="font-semibold">
                              {testResults[testKey("Kuma", source.id)].message}
                            </p>
                            {testResults[testKey("Kuma", source.id)].sampleLine ? (
                              <p className="mt-1 font-mono text-muted">
                                Sample: {testResults[testKey("Kuma", source.id)].sampleLine}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-base/40 p-4">
              <h3 className="text-lg font-semibold">Auto Refresh</h3>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={5}
                  value={settingsDraft.refreshInterval}
                  onChange={(event) =>
                    setSettingsDraft({
                      ...settingsDraft,
                      refreshInterval: Number(event.target.value)
                    })
                  }
                  disabled={!canEditSettings}
                  className="w-32 rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
                />
                <span className="text-sm text-muted">seconds (min 5)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-border bg-surface/90 p-4 text-sm text-muted shadow-card backdrop-blur sm:p-6">
          <p className="uppercase tracking-[0.3em]">Endpoint Notes</p>
          <ul className="mt-3 space-y-2">
            <li>Prometheus and Zabbix URLs auto-append their API endpoints.</li>
            <li>Kuma status page uses `/api/status-page/slug` with optional API key.</li>
            <li>Kuma API key mode uses `/api/monitors` for down checks.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
