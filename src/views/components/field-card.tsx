import { useEffect, useState } from "react";
import type { FieldDef } from "@/metadata.js";
import { isFilled, LEVEL_LABELS } from "@/metadata.js";

export const asString = (v: unknown): string => (typeof v === "string" ? v : "");
export const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];

/** Normalize a field value for display and diff comparison. */
export function displayValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (v == null) return "";
  return String(v).trim();
}

const LEVEL_STYLES: Record<string, string> = {
  mandatory: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  recommended: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  optional: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

interface FieldCardProps {
  def: FieldDef;
  value: unknown;
  /** The value suggested by the assistant (initial draft). */
  proposal?: unknown;
  /** The currently published value (enables the diff block when it differs). */
  existing?: unknown;
  diffMode: boolean;
  themes: string[];
  onChange: (value: unknown) => void;
}

export default function FieldCard({
  def,
  value,
  proposal,
  existing,
  diffMode,
  themes,
  onChange,
}: FieldCardProps) {
  const [showHelp, setShowHelp] = useState(false);
  const filled = isFilled(value);
  const hasSuggestion =
    diffMode &&
    proposal !== undefined &&
    displayValue(proposal) !== displayValue(existing);
  const current = displayValue(value);
  const usingProposal = hasSuggestion && current === displayValue(proposal);
  const usingExisting = hasSuggestion && current === displayValue(existing);

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 bg-white dark:bg-zinc-900 ${
        def.level === "mandatory" && !filled
          ? "border-red-300 dark:border-red-800"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <label className="font-medium text-[15px]" title={def.dcat}>
            {def.label}
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${LEVEL_STYLES[def.level]}`}
            >
              {LEVEL_LABELS[def.level]}
            </span>
            {def.level === "mandatory" && (
              <span
                className={`text-[11px] ${filled ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
              >
                {filled ? "✓ ausgefüllt" : "fehlt noch"}
              </span>
            )}
            <span
              className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono"
              title="Technischer Standard-Begriff (für Fachleute)"
            >
              {def.dcat}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          aria-label="Hilfe anzeigen"
          className="shrink-0 h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-[13px] p-3 flex flex-col gap-1">
          <p>{def.help}</p>
          {def.example && (
            <p>
              <span className="font-medium">Beispiel:</span> {def.example}
            </p>
          )}
        </div>
      )}

      {hasSuggestion && (
        <div className="rounded-lg border border-violet-200 dark:border-violet-900 overflow-hidden text-[13px]">
          <div
            className={`p-2.5 flex flex-col gap-1 ${usingExisting ? "bg-violet-50 dark:bg-violet-950/40" : ""}`}
          >
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Bisher
            </span>
            <span className="whitespace-pre-wrap">
              {displayValue(existing) || <em className="text-zinc-400">leer</em>}
            </span>
            <button
              type="button"
              onClick={() => onChange(existing ?? undefined)}
              className={`self-start mt-1 text-[12px] px-2 py-1 rounded-md border ${
                usingExisting
                  ? "border-violet-500 text-violet-700 dark:text-violet-300 font-medium"
                  : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {usingExisting ? "✓ Bisheriges behalten" : "Bisheriges behalten"}
            </button>
          </div>
          <div
            className={`p-2.5 flex flex-col gap-1 border-t border-violet-200 dark:border-violet-900 ${usingProposal ? "bg-violet-50 dark:bg-violet-950/40" : ""}`}
          >
            <span className="text-[11px] uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Vorschlag
            </span>
            <span className="whitespace-pre-wrap">
              {displayValue(proposal) || <em className="text-zinc-400">leer</em>}
            </span>
            <button
              type="button"
              onClick={() => onChange(proposal)}
              className={`self-start mt-1 text-[12px] px-2 py-1 rounded-md border ${
                usingProposal
                  ? "border-violet-500 text-violet-700 dark:text-violet-300 font-medium"
                  : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {usingProposal ? "✓ Vorschlag übernommen" : "Vorschlag übernehmen"}
            </button>
          </div>
        </div>
      )}

      <FieldInput def={def} value={value} themes={themes} onChange={onChange} />
    </div>
  );
}

interface FieldInputProps {
  def: FieldDef;
  value: unknown;
  themes: string[];
  onChange: (value: unknown) => void;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-violet-400";

function FieldInput({ def, value, themes, onChange }: FieldInputProps) {
  // Text-like inputs keep local state and commit on blur so the shared view
  // state is not re-synced to the host on every keystroke.
  const committed =
    def.input === "tags" ? asArray(value).join(", ") : asString(value);
  const [text, setText] = useState(committed);
  useEffect(() => setText(committed), [committed]);

  const commit = () => {
    if (def.input === "tags") {
      const items = text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      onChange(items.length ? items : undefined);
    } else {
      onChange(text.trim() || undefined);
    }
  };

  switch (def.input) {
    case "textarea":
      return (
        <textarea
          className={`${inputClass} min-h-28`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          placeholder={def.example}
        />
      );
    case "select":
      return (
        <div className="flex flex-col gap-1">
          <select
            className={inputClass}
            value={asString(value)}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            <option value="">– bitte wählen –</option>
            {(def.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {(() => {
            const selected = (def.options ?? []).find(
              (o) => o.value === asString(value),
            );
            return selected?.hint ? (
              <span className="text-[12px] text-zinc-500">{selected.hint}</span>
            ) : null;
          })()}
        </div>
      );
    case "themes": {
      const selected = asArray(value);
      return (
        <div className="flex flex-wrap gap-1.5">
          {themes.map((theme) => {
            const active = selected.includes(theme);
            return (
              <button
                key={theme}
                type="button"
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((t) => t !== theme).length
                        ? selected.filter((t) => t !== theme)
                        : undefined
                      : [...selected, theme],
                  )
                }
                className={`text-[12px] px-2.5 py-1 rounded-full border ${
                  active
                    ? "border-violet-500 bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 font-medium"
                    : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {theme}
              </button>
            );
          })}
        </div>
      );
    }
    case "date":
      return (
        <input
          type="date"
          className={`${inputClass} max-w-52`}
          value={asString(value)}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case "tags":
      return (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            className={inputClass}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            placeholder={def.example ?? "Begriffe mit Komma trennen"}
          />
          <span className="text-[12px] text-zinc-500">
            Mehrere Begriffe mit Komma trennen.
          </span>
        </div>
      );
    default:
      return (
        <input
          type={def.input === "email" ? "email" : def.input === "url" ? "url" : "text"}
          className={inputClass}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          placeholder={def.example}
        />
      );
  }
}
