import clsx from "clsx";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDatabase, faTrashCan } from "@fortawesome/free-solid-svg-icons";

import PageSectionHeader from "../../../components/PageSectionHeader";
import type { KumaSource, PrometheusSource, Settings, ZabbixSource } from "../../../lib/types";
import type { TestState } from "../types";
import {
  settingsFieldClass,
  settingsLabelClass,
  settingsPanelCard,
  settingsShellCard,
  settingsMutedButton,
  settingsPrimaryButton
} from "./theme";

type DataSourcesSectionProps = {
  headerRight?: React.ReactNode;
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

type SourceKind = "Prometheus" | "Zabbix" | "Kuma";

type SourceEntry =
  | { kind: "Prometheus"; data: PrometheusSource }
  | { kind: "Zabbix"; data: ZabbixSource }
  | { kind: "Kuma"; data: KumaSource };

function sourceLabel(entry: SourceEntry) {
  return entry.data.name.trim() || `Untitled ${entry.kind}`;
}

function sourceTypeLabel(kind: SourceKind) {
  if (kind === "Prometheus") {
    return "Alertmanager";
  }
  if (kind === "Kuma") {
    return "Uptime Kuma";
  }
  return "Zabbix";
}

function sourceUrl(entry: SourceEntry) {
  if (entry.kind === "Prometheus") {
    return entry.data.url;
  }
  if (entry.kind === "Kuma") {
    return entry.data.baseUrl;
  }
  return entry.data.url;
}

function sourceKey(entry: SourceEntry) {
  return `${entry.kind}:${entry.data.id}`;
}

function SourceField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className={settingsLabelClass}>{label}</span>
      {children}
    </label>
  );
}

export default function DataSourcesSection({
  headerRight,
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
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardKind, setWizardKind] = useState<SourceKind | null>(null);
  const [wizardSource, setWizardSource] = useState<PrometheusSource | ZabbixSource | KumaSource | null>(
    null
  );
  const [wizardTest, setWizardTest] = useState<TestState | null>(null);
  const [wizardBusy, setWizardBusy] = useState(false);

  const deleteSource = (entry: SourceEntry) => {
    const label = sourceLabel(entry);
    const confirmed = window.confirm(`Delete data source "${label}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    if (entry.kind === "Prometheus") {
      setSettingsDraft((prev) => ({
        ...prev,
        prometheusSources: prev.prometheusSources.filter((source) => source.id !== entry.data.id)
      }));
      return;
    }

    if (entry.kind === "Zabbix") {
      setSettingsDraft((prev) => ({
        ...prev,
        zabbixSources: prev.zabbixSources.filter((source) => source.id !== entry.data.id)
      }));
      return;
    }

    setSettingsDraft((prev) => ({
      ...prev,
      kumaSources: prev.kumaSources.filter((source) => source.id !== entry.data.id)
    }));
  };

  const sourceEntries: SourceEntry[] = [
    ...settingsDraft.zabbixSources.map((data) => ({ kind: "Zabbix" as const, data })),
    ...settingsDraft.kumaSources.map((data) => ({ kind: "Kuma" as const, data })),
    ...settingsDraft.prometheusSources.map((data) => ({ kind: "Prometheus" as const, data }))
  ];
  const selectedEntry =
    sourceEntries.find((entry) => sourceKey(entry) === selectedSourceKey) ?? sourceEntries[0] ?? null;

  const selectedTest = selectedEntry
    ? testResults[testKey(selectedEntry.kind, selectedEntry.data.id)]
    : null;

  const openWizard = () => {
    if (!canEditSettings) {
      return;
    }
    setIsWizardOpen(true);
    setWizardStep(1);
    setWizardKind(null);
    setWizardSource(null);
    setWizardTest(null);
  };

  const closeWizard = () => {
    if (wizardBusy) {
      return;
    }
    setIsWizardOpen(false);
    setWizardStep(1);
    setWizardKind(null);
    setWizardSource(null);
    setWizardTest(null);
  };

  const initializeWizardSource = (kind: SourceKind) => {
    if (kind === "Prometheus") {
      return createPrometheusSource();
    }
    if (kind === "Kuma") {
      return createKumaSource();
    }
    return createZabbixSource();
  };

  const patchWizardSource = (
    patch: Partial<PrometheusSource> | Partial<ZabbixSource> | Partial<KumaSource>
  ) => {
    setWizardSource((prev) =>
      prev ? ({ ...prev, ...patch } as PrometheusSource | ZabbixSource | KumaSource) : prev
    );
    setWizardTest(null);
  };

  const wizardStepTwoValid = (() => {
    if (!wizardSource || !wizardKind) {
      return false;
    }
    if (wizardSource.name.trim().length === 0) {
      return false;
    }
    if (wizardKind === "Prometheus") {
      if (!("url" in wizardSource) || !("authType" in wizardSource) || !("authValue" in wizardSource)) {
        return false;
      }
      if (wizardSource.url.trim().length === 0) {
        return false;
      }
      if (wizardSource.authType !== "none" && wizardSource.authValue.trim().length === 0) {
        return false;
      }
      return true;
    }
    if (wizardKind === "Zabbix") {
      if (!("url" in wizardSource) || !("token" in wizardSource)) {
        return false;
      }
      return wizardSource.url.trim().length > 0 && wizardSource.token.trim().length > 0;
    }
    if (!("baseUrl" in wizardSource) || !("mode" in wizardSource)) {
      return false;
    }
    if (wizardSource.baseUrl.trim().length === 0) {
      return false;
    }
    if (wizardSource.mode === "status") {
      if (!("slug" in wizardSource)) {
        return false;
      }
      return wizardSource.slug.trim().length > 0;
    }
    if (!("key" in wizardSource)) {
      return false;
    }
    return wizardSource.key.trim().length > 0;
  })();

  const runWizardTest = async () => {
    if (!wizardSource || !wizardKind || wizardBusy) {
      return;
    }
    setWizardBusy(true);
    setWizardTest({ status: "loading", message: "Testing connection..." });
    try {
      const response = await fetch("/api/test-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: wizardKind, source: wizardSource })
      });

      if (!response.ok) {
        const data = await response.json();
        setWizardTest({
          status: "error",
          message: data.error ?? "Test failed."
        });
        return;
      }

      const data = (await response.json()) as { message?: string; sampleLine?: string | null };
      setWizardTest({
        status: "success",
        message: data.message ?? "Connected.",
        sampleLine: data.sampleLine ?? null
      });
    } catch {
      setWizardTest({
        status: "error",
        message: "Unable to test connection."
      });
    } finally {
      setWizardBusy(false);
    }
  };

  const wizardCanSave = wizardStepTwoValid && wizardTest?.status === "success";
  const wizardSourceUrl = wizardSource
    ? "baseUrl" in wizardSource
      ? wizardSource.baseUrl
      : wizardSource.url
    : "";

  const saveWizardSource = () => {
    if (!wizardSource || !wizardKind || wizardBusy) {
      return;
    }

    setSettingsDraft((prev) => {
      if (wizardKind === "Prometheus") {
        return {
          ...prev,
          prometheusSources: [...prev.prometheusSources, wizardSource as PrometheusSource]
        };
      }
      if (wizardKind === "Zabbix") {
        return {
          ...prev,
          zabbixSources: [...prev.zabbixSources, wizardSource as ZabbixSource]
        };
      }
      return {
        ...prev,
        kumaSources: [...prev.kumaSources, wizardSource as KumaSource]
      };
    });

    setSelectedSourceKey(`${wizardKind}:${wizardSource.id}`);
    closeWizard();
  };

  return (
    <section className="space-y-4">
      <PageSectionHeader
        icon={faDatabase}
        title="Data Sources"
        subtitle="Configure endpoints, auth, and validation using the shared Pulze settings style."
        right={headerRight}
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col">
          <aside className={clsx(settingsShellCard, "h-full overflow-hidden")}>
            <div className="flex items-center justify-between px-5 py-5">
              <span className={settingsLabelClass}>Data Sources</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openWizard}
                  disabled={!canEditSettings}
                  className="text-xl leading-none text-accent"
                  title="Add new data source"
                >
                  +
                </button>
              </div>
            </div>
            <div className="space-y-2 px-3 pb-4">
              {sourceEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#1e2530] px-4 py-6 text-sm text-slate-500">
                  Add a source to start configuring integrations.
                </div>
              ) : (
                sourceEntries.map((entry) => {
                  const isSelected = selectedEntry ? sourceKey(entry) === sourceKey(selectedEntry) : false;
                  return (
                    <div
                      key={`${entry.kind}-${entry.data.id}`}
                      onClick={() => setSelectedSourceKey(sourceKey(entry))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedSourceKey(sourceKey(entry));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        "block w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors",
                        isSelected
                          ? "border-accent/45 bg-accent/10"
                          : "border-transparent bg-transparent hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {sourceLabel(entry)}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {sourceTypeLabel(entry.kind)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteSource(entry);
                            }}
                            disabled={!canEditSettings}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                            title={`Delete ${sourceLabel(entry)}`}
                            aria-label={`Delete ${sourceLabel(entry)}`}
                          >
                            <FontAwesomeIcon icon={faTrashCan} className="h-3.5 w-3.5" />
                          </button>
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full",
                              isSelected ? "bg-accent" : "bg-slate-500"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>

        <div className="px-0 py-0">
          {selectedEntry ? (
            <div className="w-full">
              {settingsStatus ? <p className="mb-4 text-sm text-slate-400">{settingsStatus}</p> : null}
              {hasInvalidLabels ? (
                <p className="mb-4 text-sm text-rose-400">
                  Every configured source needs a display label before saving.
                </p>
              ) : null}

              <div className="space-y-6">
                <div className={clsx(settingsPanelCard, "p-5 lg:p-6")}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <SourceField label="Display Label">
                      <input
                        value={selectedEntry.data.name}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (selectedEntry.kind === "Prometheus") {
                            updatePrometheusSource(selectedEntry.data.id, { name: value });
                          } else if (selectedEntry.kind === "Zabbix") {
                            updateZabbixSource(selectedEntry.data.id, { name: value });
                          } else {
                            updateKumaSource(selectedEntry.data.id, { name: value });
                          }
                        }}
                        disabled={!canEditSettings}
                        className={settingsFieldClass}
                      />
                    </SourceField>

                    <SourceField label="Mode">
                      {selectedEntry.kind === "Prometheus" ? (
                        <select
                          value={selectedEntry.data.authType}
                          onChange={(event) =>
                            updatePrometheusSource(selectedEntry.data.id, {
                              authType: event.target.value as PrometheusSource["authType"]
                            })
                          }
                          disabled={!canEditSettings}
                          className={settingsFieldClass}
                        >
                          <option value="none">No Auth</option>
                          <option value="basic">Basic Auth</option>
                          <option value="bearer">API Key</option>
                        </select>
                      ) : selectedEntry.kind === "Kuma" ? (
                        <select
                          value={selectedEntry.data.mode}
                          onChange={(event) =>
                            updateKumaSource(selectedEntry.data.id, {
                              mode: event.target.value as KumaSource["mode"]
                            })
                          }
                          disabled={!canEditSettings}
                          className={settingsFieldClass}
                        >
                          <option value="status">Status Page</option>
                          <option value="apiKey">API Key</option>
                        </select>
                      ) : (
                        <select disabled className={settingsFieldClass}>
                          <option>API Key</option>
                        </select>
                      )}
                    </SourceField>
                  </div>

                  <div className="mt-5">
                    <SourceField label="Base Url">
                      <input
                        value={sourceUrl(selectedEntry)}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (selectedEntry.kind === "Prometheus") {
                            updatePrometheusSource(selectedEntry.data.id, { url: value });
                          } else if (selectedEntry.kind === "Zabbix") {
                            updateZabbixSource(selectedEntry.data.id, { url: value });
                          } else {
                            updateKumaSource(selectedEntry.data.id, { baseUrl: value });
                          }
                        }}
                        disabled={!canEditSettings}
                        className={settingsFieldClass}
                      />
                    </SourceField>
                  </div>

                  {selectedEntry.kind === "Prometheus" ? (
                    <div className="mt-5">
                      <SourceField label="Credential">
                        <input
                          value={selectedEntry.data.authValue}
                          onChange={(event) =>
                            updatePrometheusSource(selectedEntry.data.id, {
                              authValue: event.target.value
                            })
                          }
                          disabled={!canEditSettings}
                          placeholder="user:password or token"
                          className={settingsFieldClass}
                        />
                      </SourceField>
                    </div>
                  ) : selectedEntry.kind === "Zabbix" ? (
                    <div className="mt-5">
                      <SourceField label="Api Token">
                        <input
                          value={selectedEntry.data.token}
                          onChange={(event) =>
                            updateZabbixSource(selectedEntry.data.id, { token: event.target.value })
                          }
                          disabled={!canEditSettings}
                          className={settingsFieldClass}
                        />
                      </SourceField>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <SourceField label="Status Page Slug">
                        <input
                          value={selectedEntry.data.slug}
                          onChange={(event) =>
                            updateKumaSource(selectedEntry.data.id, { slug: event.target.value })
                          }
                          disabled={!canEditSettings || selectedEntry.data.mode !== "status"}
                          className={settingsFieldClass}
                        />
                      </SourceField>
                      <SourceField label="Api Key">
                        <input
                          value={selectedEntry.data.key}
                          onChange={(event) =>
                            updateKumaSource(selectedEntry.data.id, { key: event.target.value })
                          }
                          disabled={!canEditSettings}
                          className={settingsFieldClass}
                        />
                      </SourceField>
                    </div>
                  )}
                </div>

                <div className={clsx(settingsPanelCard, "p-5 lg:p-6")}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                      Validation
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => testSource(selectedEntry.kind, selectedEntry.data)}
                        disabled={!canEditSettings || !sourceUrl(selectedEntry)}
                        className={settingsMutedButton}
                      >
                        Test Connection
                      </button>
                    </div>
                  </div>
                  {selectedTest ? (
                    <div
                      className={clsx(
                        "mt-4 rounded-xl border px-4 py-3 text-sm",
                        selectedTest.status === "error"
                          ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                          : "border-[#1d2f4c] bg-[#07101f] text-slate-300"
                      )}
                    >
                      <p>{selectedTest.message}</p>
                      {selectedTest.sampleLine ? (
                        <p className="mt-2 font-mono text-xs text-slate-400">
                          {selectedTest.sampleLine}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Test the selected endpoint to confirm connectivity and credentials.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedEntry ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="hidden lg:block" />
          <div>
            <div className="flex w-full flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={!canEditSettings || hasInvalidLabels}
                className={settingsPrimaryButton}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isWizardOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close add source wizard"
            className="absolute inset-0 bg-[#030916]/55 backdrop-blur-sm"
            onClick={closeWizard}
          />

          <div className="relative z-[91] w-full max-w-2xl rounded-2xl border border-[#1d2f4c] bg-[#07101f] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#1d2f4c] px-5 py-4">
              <div>
                <p className={settingsLabelClass}>Add Data Source</p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  Step {wizardStep} of 3
                </h3>
              </div>
              <button
                type="button"
                onClick={closeWizard}
                disabled={wizardBusy}
                className={clsx(settingsMutedButton, "disabled:opacity-50")}
              >
                Close
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={clsx(
                      "rounded-lg border px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.15em]",
                      wizardStep === step
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-[#1d2f4c] bg-[#091425] text-slate-500"
                    )}
                  >
                    Step {step}
                  </div>
                ))}
              </div>

              {wizardStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Choose which source you want to add.</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      {
                        kind: "Zabbix" as const,
                        label: "Zabbix",
                        description: "API token based source"
                      },
                      {
                        kind: "Prometheus" as const,
                        label: "Alertmanager",
                        description: "Prometheus alert feed"
                      },
                      {
                        kind: "Kuma" as const,
                        label: "Uptime Kuma",
                        description: "Status page or API key"
                      }
                    ].map((option) => (
                      <button
                        key={option.kind}
                        type="button"
                        onClick={() => setWizardKind(option.kind)}
                        className={clsx(
                          "rounded-xl border p-4 text-left transition",
                          wizardKind === option.kind
                            ? "border-accent/45 bg-accent/10"
                            : "border-[#1d2f4c] bg-[#091425] hover:border-accent/30"
                        )}
                      >
                        <p className="text-sm font-semibold text-white">{option.label}</p>
                        <p className="mt-2 text-xs text-slate-500">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 && wizardSource ? (
                <div className="space-y-5">
                  <p className="text-sm text-slate-400">
                    Provide connection details for the selected source.
                  </p>

                  <div className="grid gap-5 md:grid-cols-2">
                    <SourceField label="Display Label">
                      <input
                        value={wizardSource.name}
                        onChange={(event) => patchWizardSource({ name: event.target.value })}
                        className={settingsFieldClass}
                      />
                    </SourceField>

                    {wizardKind === "Prometheus" && "authType" in wizardSource ? (
                      <SourceField label="Auth Mode">
                        <select
                          value={wizardSource.authType}
                          onChange={(event) =>
                            patchWizardSource({
                              authType: event.target.value as PrometheusSource["authType"],
                              authValue:
                                event.target.value === "none" ? "" : wizardSource.authValue
                            })
                          }
                          className={settingsFieldClass}
                        >
                          <option value="none">No Auth</option>
                          <option value="basic">Basic Auth</option>
                          <option value="bearer">API Key</option>
                        </select>
                      </SourceField>
                    ) : wizardKind === "Kuma" && "mode" in wizardSource ? (
                      <SourceField label="Mode">
                        <select
                          value={wizardSource.mode}
                          onChange={(event) =>
                            patchWizardSource({
                              mode: event.target.value as KumaSource["mode"]
                            })
                          }
                          className={settingsFieldClass}
                        >
                          <option value="status">Status Page</option>
                          <option value="apiKey">API Key</option>
                        </select>
                      </SourceField>
                    ) : (
                      <SourceField label="Mode">
                        <input value="API Key" disabled className={settingsFieldClass} />
                      </SourceField>
                    )}
                  </div>

                  {"url" in wizardSource ? (
                    <SourceField label="Base Url">
                      <input
                        value={wizardSource.url}
                        onChange={(event) => patchWizardSource({ url: event.target.value })}
                        className={settingsFieldClass}
                      />
                    </SourceField>
                  ) : (
                    <SourceField label="Base Url">
                      <input
                        value={wizardSource.baseUrl}
                        onChange={(event) => patchWizardSource({ baseUrl: event.target.value })}
                        className={settingsFieldClass}
                      />
                    </SourceField>
                  )}

                  {wizardKind === "Prometheus" && "authType" in wizardSource ? (
                    wizardSource.authType !== "none" ? (
                      <SourceField label="Credential">
                        <input
                          value={wizardSource.authValue}
                          onChange={(event) => patchWizardSource({ authValue: event.target.value })}
                          className={settingsFieldClass}
                          placeholder={
                            wizardSource.authType === "basic" ? "user:password" : "Bearer token"
                          }
                        />
                      </SourceField>
                    ) : null
                  ) : null}

                  {wizardKind === "Zabbix" && "token" in wizardSource ? (
                    <SourceField label="Api Token">
                      <input
                        value={wizardSource.token}
                        onChange={(event) => patchWizardSource({ token: event.target.value })}
                        className={settingsFieldClass}
                      />
                    </SourceField>
                  ) : null}

                  {wizardKind === "Kuma" && "mode" in wizardSource ? (
                    wizardSource.mode === "status" ? (
                      <SourceField label="Status Page Slug">
                        <input
                          value={wizardSource.slug}
                          onChange={(event) => patchWizardSource({ slug: event.target.value })}
                          className={settingsFieldClass}
                        />
                      </SourceField>
                    ) : (
                      <SourceField label="Api Key">
                        <input
                          value={wizardSource.key}
                          onChange={(event) => patchWizardSource({ key: event.target.value })}
                          className={settingsFieldClass}
                        />
                      </SourceField>
                    )
                  ) : null}
                </div>
              ) : null}

              {wizardStep === 3 && wizardSource && wizardKind ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-[#1d2f4c] bg-[#091425] p-4">
                    <p className={settingsLabelClass}>Summary</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {wizardSource.name.trim() || `Untitled ${wizardKind}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {sourceTypeLabel(wizardKind)} • {wizardSourceUrl || "No URL provided"}
                    </p>
                  </div>

                  <div className={clsx(settingsPanelCard, "p-4")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                        Step 3: Test & Save
                      </p>
                      <button
                        type="button"
                        onClick={runWizardTest}
                        disabled={wizardBusy || wizardSourceUrl.trim().length === 0}
                        className={clsx(settingsMutedButton, "disabled:opacity-50")}
                      >
                        {wizardBusy ? "Testing..." : "Test Connection"}
                      </button>
                    </div>

                    {wizardTest ? (
                      <div
                        className={clsx(
                          "mt-4 rounded-xl border px-4 py-3 text-sm",
                          wizardTest.status === "error"
                            ? "border-rose-500/35 bg-rose-500/10 text-rose-300"
                            : wizardTest.status === "success"
                              ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                              : "border-[#1d2f4c] bg-[#07101f] text-slate-300"
                        )}
                      >
                        <p>{wizardTest.message}</p>
                        {wizardTest.sampleLine ? (
                          <p className="mt-2 font-mono text-xs text-slate-400">{wizardTest.sampleLine}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">
                        Run a connection test, then save this source.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1d2f4c] px-5 py-4">
              <button
                type="button"
                onClick={closeWizard}
                disabled={wizardBusy}
                className={clsx(settingsMutedButton, "disabled:opacity-50")}
              >
                Cancel
              </button>

              <div className="flex flex-wrap gap-2">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 3) {
                        setWizardStep(2);
                        return;
                      }
                      setWizardStep(1);
                    }}
                    disabled={wizardBusy}
                    className={clsx(settingsMutedButton, "disabled:opacity-50")}
                  >
                    Back
                  </button>
                ) : null}

                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) {
                        if (!wizardKind) {
                          return;
                        }
                        setWizardSource(initializeWizardSource(wizardKind));
                        setWizardTest(null);
                        setWizardStep(2);
                        return;
                      }
                      if (!wizardStepTwoValid) {
                        return;
                      }
                      setWizardStep(3);
                    }}
                    disabled={
                      wizardBusy ||
                      (wizardStep === 1 && !wizardKind) ||
                      (wizardStep === 2 && !wizardStepTwoValid)
                    }
                    className={settingsPrimaryButton}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveWizardSource}
                    disabled={!wizardCanSave || wizardBusy}
                    className={settingsPrimaryButton}
                  >
                    Save Source
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
