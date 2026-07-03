import "@/index.css";

import { useMemo } from "react";
import { useLayout, useViewState } from "skybridge/web";
import { useToolInfo } from "@/helpers.js";
import type { MetadataDraft, RequirementLevel } from "@/metadata.js";
import {
  completeness,
  fieldsByLevel,
  isFilled,
  toMarkdownChecklist,
  toOdsMetas,
} from "@/metadata.js";
import CopyBlock, { CopyButton } from "./components/copy-block.js";
import FieldCard, { displayValue } from "./components/field-card.js";

type EditorState = {
  /** The user's current working draft (seeded from the tool output). */
  draft?: MetadataDraft;
  step?: number;
};

const STEPS: { label: string; level?: RequirementLevel; intro: string }[] = [
  {
    label: "Pflichtangaben",
    level: "mandatory",
    intro:
      "Diese Angaben braucht jeder Datensatz. Ohne sie können Nutzende die Daten weder finden noch korrekt verwenden.",
  },
  {
    label: "Empfohlen",
    level: "recommended",
    intro:
      "Diese Angaben machen den Datensatz deutlich verständlicher und besser auffindbar — wenn möglich ausfüllen.",
  },
  {
    label: "Optional",
    level: "optional",
    intro: "Zusatzangaben für besonders vollständige Metadaten. Gerne überspringen.",
  },
  {
    label: "Exportieren",
    intro:
      "Fertig! Kopieren Sie die Werte ins Opendatasoft-Backoffice — als Checkliste zum Abarbeiten oder als JSON für technische Nutzer.",
  },
];

export default function MetadataEditor() {
  const { theme } = useLayout();
  const { output } = useToolInfo<"show_metadata_editor">();
  const [state, setState] = useViewState<EditorState>({});

  const existing = (output?.existing ?? undefined) as MetadataDraft | undefined;
  const proposal = output?.draft as MetadataDraft | undefined;
  const diffMode = existing !== undefined;

  // In diff mode the working draft starts as "existing overlaid with the
  // proposal": fields without a suggestion keep their published value.
  const initialDraft = useMemo<MetadataDraft | undefined>(() => {
    if (!proposal) return undefined;
    return diffMode ? { ...existing, ...proposal } : proposal;
  }, [proposal, existing, diffMode]);

  const draft = state.draft ?? initialDraft;
  const step = state.step ?? 0;

  if (!output || !draft) {
    return (
      <div className="p-6 text-sm text-zinc-500">Metadaten-Editor wird geladen…</div>
    );
  }

  const themes = output.availableThemes ?? [];
  const source = output.source ?? undefined;
  const check = completeness(draft);

  const setField = (key: string, value: unknown) => {
    setState((prev) => {
      const base = prev.draft ?? initialDraft ?? {};
      const next: Record<string, unknown> = { ...base };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return { ...prev, draft: next as MetadataDraft };
    });
  };

  const setStep = (next: number) =>
    setState((prev) => ({ ...prev, draft: prev.draft ?? initialDraft, step: next }));

  const suggestionCount = diffMode
    ? Object.keys(proposal ?? {}).filter(
        (k) =>
          displayValue((proposal as Record<string, unknown>)[k]) !==
          displayValue((existing as Record<string, unknown>)[k]),
      ).length
    : 0;

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} mx-auto w-full max-w-3xl bg-background text-foreground`}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold">Metadaten-Assistent</h1>
          <p className="text-[13px] text-zinc-500">
            {source?.label
              ? source.type === "dataset"
                ? `Bestehender Datensatz: ${source.label}`
                : `Neue Daten: ${source.label}`
              : "Metadaten Schritt für Schritt prüfen und vervollständigen."}
            {diffMode && suggestionCount > 0 && (
              <> · {suggestionCount} Verbesserungsvorschläge zum Prüfen</>
            )}
          </p>
        </div>

        {/* Completeness */}
        <div
          className="flex flex-col gap-1.5"
          data-llm={`Vollständigkeit ${check.score}%. Pflichtfelder ${check.mandatoryFilled}/${check.mandatoryTotal}, empfohlene Felder ${check.recommendedFilled}/${check.recommendedTotal}. Fehlende Pflichtangaben: ${check.missingMandatory.map((f) => f.label).join(", ") || "keine"}.`}
        >
          <div className="flex items-center justify-between text-[12px] text-zinc-500">
            <span>
              Vollständigkeit: <strong className="text-foreground">{check.score} %</strong>
            </span>
            <span>
              Pflicht {check.mandatoryFilled}/{check.mandatoryTotal} · Empfohlen{" "}
              {check.recommendedFilled}/{check.recommendedTotal}
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                check.mandatoryFilled === check.mandatoryTotal
                  ? "bg-green-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.max(check.score, 3)}%` }}
            />
          </div>
        </div>

        {/* Stepper */}
        <div className="flex gap-1.5 flex-wrap">
          {STEPS.map((s, i) => {
            const fields = s.level ? fieldsByLevel(s.level) : [];
            const done =
              s.level &&
              fields.length > 0 &&
              fields.every((f) => isFilled(draft[f.key]));
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setStep(i)}
                className={`text-[13px] px-3 py-1.5 rounded-full border ${
                  step === i
                    ? "border-violet-500 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 font-medium"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {i + 1}. {s.label}
                {done ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        <p className="text-[13px] text-zinc-500">{STEPS[step]?.intro}</p>

        {/* Step content */}
        {STEPS[step]?.level ? (
          <div className="flex flex-col gap-3">
            {fieldsByLevel(STEPS[step].level).map((def) => (
              <FieldCard
                key={def.key}
                def={def}
                value={draft[def.key]}
                proposal={proposal?.[def.key]}
                existing={existing?.[def.key]}
                diffMode={diffMode}
                themes={themes}
                onChange={(value) => setField(def.key, value)}
              />
            ))}
          </div>
        ) : (
          <ExportStep draft={draft} sourceLabel={source?.label} />
        )}

        {/* Nav */}
        <div className="flex justify-between pt-1">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="text-[13px] px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← Zurück
          </button>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="text-[13px] px-4 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700"
            >
              Weiter →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExportStep({
  draft,
  sourceLabel,
}: {
  draft: MetadataDraft;
  sourceLabel?: string;
}) {
  const check = completeness(draft);
  const json = useMemo(() => JSON.stringify(toOdsMetas(draft), null, 2), [draft]);
  const markdown = useMemo(
    () => toMarkdownChecklist(draft, { label: sourceLabel }),
    [draft, sourceLabel],
  );
  const filledFields = ["mandatory", "recommended", "optional"].flatMap((level) =>
    fieldsByLevel(level as RequirementLevel).filter((f) => isFilled(draft[f.key])),
  );

  return (
    <div className="flex flex-col gap-4">
      {check.missingMandatory.length > 0 && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-[13px] p-3">
          <strong>Noch nicht vollständig:</strong> Es fehlen Pflichtangaben —{" "}
          {check.missingMandatory.map((f) => f.label).join(" · ")}. Sie können trotzdem
          exportieren und die Lücken später schliessen.
        </div>
      )}

      {/* Per-field copy list for the backoffice */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700 overflow-hidden">
        {filledFields.map((f) => {
          const value = displayValue(draft[f.key]);
          return (
            <div
              key={f.key}
              className="flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-zinc-900"
            >
              <div className="min-w-0">
                <div className="text-[12px] text-zinc-500">{f.odsField}</div>
                <div className="text-[13px] truncate" title={value}>
                  {value}
                </div>
              </div>
              <CopyButton text={value} />
            </div>
          );
        })}
      </div>

      <CopyBlock title="Checkliste fürs Backoffice (Markdown)" text={markdown} />
      <CopyBlock title="JSON (Opendatasoft-metas-Struktur)" text={json} />
    </div>
  );
}
