import type { AlertSeverity, AlertSource, SilenceRule } from "../../../lib/types";

type SilenceDraft = {
  id?: string;
  name: string;
  sourceType: AlertSource | "Any";
  sourceId: string;
  sourceLabel: string;
  servicePattern: string;
  environmentPattern: string;
  alertNamePattern: string;
  instancePattern: string;
  severity: AlertSeverity | "Any";
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

type SourceOption = {
  id: string;
  type: AlertSource;
  label: string;
};

type SilencesSectionProps = {
  canEditSilences: boolean;
  silences: SilenceRule[];
  silenceStatus: string | null;
  silenceDraft: SilenceDraft;
  setSilenceDraft: React.Dispatch<React.SetStateAction<SilenceDraft>>;
  sourceOptions: SourceOption[];
  onCreateSilence: () => void;
  onToggleSilence: (silence: SilenceRule, enabled: boolean) => void;
  onDeleteSilence: (id: string) => void;
  onRefresh: () => void;
};

export default function SilencesSection({
  canEditSilences,
  silences,
  silenceStatus,
  silenceDraft,
  setSilenceDraft,
  sourceOptions,
  onCreateSilence,
  onToggleSilence,
  onDeleteSilence,
  onRefresh
}: SilencesSectionProps) {
  const scopedSources = sourceOptions.filter(
    (source) => silenceDraft.sourceType === "Any" || source.type === silenceDraft.sourceType
  );

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Silences</p>
            <h2 className="text-2xl font-semibold">Maintenance Windows</h2>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em]"
          >
            Refresh
          </button>
        </div>
        {silenceStatus ? <p className="mt-3 text-sm text-muted">{silenceStatus}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={silenceDraft.name}
            onChange={(event) => setSilenceDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Window name"
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <select
            value={silenceDraft.sourceType}
            onChange={(event) =>
              setSilenceDraft((prev) => ({
                ...prev,
                sourceType: event.target.value as AlertSource | "Any",
                sourceId: ""
              }))
            }
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          >
            <option value="Any">Any source</option>
            <option value="Prometheus">Prometheus</option>
            <option value="Zabbix">Zabbix</option>
            <option value="Kuma">Kuma</option>
          </select>
          <select
            value={silenceDraft.sourceId}
            onChange={(event) => {
              const source = scopedSources.find((entry) => entry.id === event.target.value);
              setSilenceDraft((prev) => ({
                ...prev,
                sourceId: event.target.value,
                sourceLabel: source?.label ?? ""
              }));
            }}
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          >
            <option value="">All configured sources</option>
            {scopedSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.type} - {source.label}
              </option>
            ))}
          </select>
          <select
            value={silenceDraft.severity}
            onChange={(event) =>
              setSilenceDraft((prev) => ({ ...prev, severity: event.target.value as AlertSeverity | "Any" }))
            }
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          >
            <option value="Any">Any severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <input
            value={silenceDraft.servicePattern}
            onChange={(event) =>
              setSilenceDraft((prev) => ({ ...prev, servicePattern: event.target.value }))
            }
            placeholder="Service pattern (e.g. api-*)"
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={silenceDraft.environmentPattern}
            onChange={(event) =>
              setSilenceDraft((prev) => ({ ...prev, environmentPattern: event.target.value }))
            }
            placeholder="Environment pattern"
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={silenceDraft.alertNamePattern}
            onChange={(event) =>
              setSilenceDraft((prev) => ({ ...prev, alertNamePattern: event.target.value }))
            }
            placeholder="Alert name pattern"
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <input
            value={silenceDraft.instancePattern}
            onChange={(event) =>
              setSilenceDraft((prev) => ({ ...prev, instancePattern: event.target.value }))
            }
            placeholder="Instance pattern"
            className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm"
          />
          <label className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm">
            <span className="block text-xs uppercase tracking-[0.2em] text-muted">Starts at</span>
            <input
              type="datetime-local"
              value={silenceDraft.startsAt}
              onChange={(event) => setSilenceDraft((prev) => ({ ...prev, startsAt: event.target.value }))}
              className="mt-2 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="rounded-xl border border-border bg-base/60 px-4 py-2 text-sm">
            <span className="block text-xs uppercase tracking-[0.2em] text-muted">Ends at</span>
            <input
              type="datetime-local"
              value={silenceDraft.endsAt}
              onChange={(event) => setSilenceDraft((prev) => ({ ...prev, endsAt: event.target.value }))}
              className="mt-2 w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onCreateSilence}
          disabled={!canEditSilences}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
        >
          Create Silence
        </button>
      </div>

      <div className="rounded-3xl border border-border bg-surface/90 p-4 shadow-card backdrop-blur sm:p-6">
        <h3 className="text-lg font-semibold">Active and Upcoming Silences</h3>
        <div className="mt-4 space-y-3">
          {silences.length === 0 ? (
            <p className="text-sm text-muted">No silences configured.</p>
          ) : (
            silences.map((silence) => (
              <div key={silence.id} className="rounded-2xl border border-border bg-base/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{silence.name}</p>
                    <p className="text-xs text-muted">
                      {silence.sourceType}
                      {silence.sourceLabel ? ` - ${silence.sourceLabel}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(silence.startsAt).toLocaleString()} - {new Date(silence.endsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSilence(silence, !silence.enabled)}
                      disabled={!canEditSilences}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                    >
                      {silence.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSilence(silence.id)}
                      disabled={!canEditSilences}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

