/**
 * Shared metadata model of the Metadata-Wizard.
 *
 * The draft is a flat object whose keys map 1:1 onto the Opendatasoft
 * `metas` structure of data.gr.ch (templates `default` and `dcat`), so a
 * finished draft can be transferred into the ODS backoffice field by field.
 * Field definitions (labels, help texts, examples, requirement levels) drive
 * the editor view; everything here is pure TypeScript usable on both the
 * server and in the browser view.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Draft schema (tool input & view state)
// ---------------------------------------------------------------------------

export const draftShape = {
  title_de: z.string().optional().describe("Titel des Datensatzes (Deutsch)"),
  description_de: z
    .string()
    .optional()
    .describe("Beschreibung (Deutsch, nur Plaintext — ODS erlaubt kein HTML)"),
  publisher_de: z.string().optional().describe("Herausgebende Stelle (Deutsch)"),
  contact_name: z.string().optional().describe("Name der Kontaktstelle"),
  contact_email: z
    .string()
    .optional()
    .describe("E-Mail der Kontaktstelle (Pflicht nach DCAT-AP CH / eCH-0200 v3)"),
  license_url: z
    .string()
    .optional()
    .describe(
      "Lizenz als opendata.swiss-URL, z. B. https://opendata.swiss/terms-of-use#terms_by",
    ),
  theme: z
    .array(z.string())
    .optional()
    .describe("Themen — deutsche Labels aus der data.gr.ch-Themenliste"),
  keyword_de: z.array(z.string()).optional().describe("Schlagworte (Deutsch)"),
  update_frequency: z
    .string()
    .optional()
    .describe("Aktualisierungsfrequenz, z. B. annual, monthly, irregular"),
  temporal_coverage_start: z
    .string()
    .optional()
    .describe("Beginn der zeitlichen Abdeckung (YYYY-MM-DD)"),
  temporal_coverage_end: z
    .string()
    .optional()
    .describe("Ende der zeitlichen Abdeckung (YYYY-MM-DD), leer = laufend"),
  spatial: z
    .string()
    .optional()
    .describe("Räumliche Abdeckung (Text wie 'Kanton Graubünden' oder geonames-URI)"),
  references: z
    .string()
    .optional()
    .describe("Link zu weiterführenden Informationen (Methodik, Erhebung)"),
  attributions: z
    .array(z.string())
    .optional()
    .describe("Quellenvermerke, z. B. Name der Erhebung oder Datenlieferanten"),
  created: z.string().optional().describe("Erstellungsdatum der Daten (YYYY-MM-DD)"),
  issued: z.string().optional().describe("Erstpublikation (YYYY-MM-DD)"),
  contributor: z.string().optional().describe("Weitere beteiligte Stelle"),
  // Additional languages (filled in the multilingual step; optional in phase 1)
  title_it: z.string().optional(),
  title_en: z.string().optional(),
  description_it: z.string().optional(),
  description_en: z.string().optional(),
  keyword_it: z.array(z.string()).optional(),
  keyword_en: z.array(z.string()).optional(),
};

export const metadataDraftSchema = z.object(draftShape);
export type MetadataDraft = z.infer<typeof metadataDraftSchema>;
export type DraftKey = keyof MetadataDraft;

// ---------------------------------------------------------------------------
// Controlled vocabularies
// ---------------------------------------------------------------------------

export interface VocabularyOption {
  value: string;
  label: string;
  hint?: string;
}

/** opendata.swiss terms of use — the licence list data.gr.ch publishes under. */
export const LICENSES: VocabularyOption[] = [
  {
    value: "https://opendata.swiss/terms-of-use#terms_open",
    label: "Freie Nutzung",
    hint: "Keine Auflagen.",
  },
  {
    value: "https://opendata.swiss/terms-of-use#terms_by",
    label: "Freie Nutzung mit Quellenangabe",
    hint: "Die Quelle muss genannt werden.",
  },
  {
    value: "https://opendata.swiss/terms-of-use#terms_ask",
    label: "Freie Nutzung, kommerzielle Nutzung mit Bewilligung",
    hint: "Kommerzielle Nutzung nur mit Bewilligung des Datenlieferanten.",
  },
  {
    value: "https://opendata.swiss/terms-of-use#terms_by_ask",
    label: "Quellenangabe Pflicht, kommerzielle Nutzung mit Bewilligung",
    hint: "Quellenangabe zwingend; kommerzielle Nutzung nur mit Bewilligung.",
  },
];

/** Subset of the EU frequency vocabulary that ODS accepts (lowercase codes). */
export const FREQUENCIES: VocabularyOption[] = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
  { value: "quarterly", label: "Vierteljährlich" },
  { value: "semiannual", label: "Halbjährlich" },
  { value: "annual", label: "Jährlich" },
  { value: "biennial", label: "Alle zwei Jahre" },
  { value: "irregular", label: "Unregelmässig" },
  { value: "continuous", label: "Laufend" },
  { value: "never", label: "Keine Aktualisierung geplant" },
];

/** German labels of the EU data themes, as used on data.gr.ch. */
export const DEFAULT_THEMES: string[] = [
  "Bevölkerung und Gesellschaft",
  "Bildung, Kultur und Sport",
  "Energie",
  "Gesundheit",
  "Internationale Themen",
  "Justiz, Rechtssystem und öffentliche Sicherheit",
  "Landwirtschaft, Fischerei, Forstwirtschaft und Nahrungsmittel",
  "Regierung und öffentlicher Sektor",
  "Regionen und Städte",
  "Umwelt",
  "Verkehr",
  "Wirtschaft und Finanzen",
  "Wissenschaft und Technologie",
];

// ---------------------------------------------------------------------------
// Field definitions (drive the editor UI)
// ---------------------------------------------------------------------------

export type RequirementLevel = "mandatory" | "recommended" | "optional";
export type InputKind =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "date"
  | "tags"
  | "select"
  | "themes";

export interface FieldDef {
  key: DraftKey;
  level: RequirementLevel;
  /** Plain-language question shown as the field label. */
  label: string;
  /** Technical DCAT / ODS term, shown only as a tooltip for experts. */
  dcat: string;
  /** Key in the ODS backoffice ("Template.Feld") for the handover checklist. */
  odsField: string;
  /** Short help text in plain language. */
  help: string;
  /** A good example value. */
  example?: string;
  input: InputKind;
  options?: VocabularyOption[];
}

export const FIELDS: FieldDef[] = [
  {
    key: "title_de",
    level: "mandatory",
    label: "Wie heisst der Datensatz?",
    dcat: "dct:title",
    odsField: "Standard → Titel (de)",
    help: "Kurz und sprechend: Was wird gezeigt, für welches Gebiet, ab wann? Keine internen Abkürzungen.",
    example: "Campingplätze Angebot nach Tourismusregionen, seit 2008",
    input: "text",
  },
  {
    key: "description_de",
    level: "mandatory",
    label: "Was zeigen die Daten?",
    dcat: "dct:description",
    odsField: "Standard → Beschreibung (de)",
    help: "2–5 Sätze: Was ist enthalten, welcher Zeitraum, woher stammen die Daten, welche Einheiten? Auch Lücken oder Besonderheiten erwähnen. Nur Text, kein HTML.",
    example:
      "Der Datensatz enthält seit 2008 die jährliche Anzahl Campingbetriebe, Stellplätze und Logiernächte je Tourismusregion. Quelle ist die Parahotelleriestatistik (PASTA) des Bundesamts für Statistik.",
    input: "textarea",
  },
  {
    key: "publisher_de",
    level: "mandatory",
    label: "Welche Stelle veröffentlicht die Daten?",
    dcat: "dct:publisher",
    odsField: "Standard → Herausgeber (de)",
    help: "Der offizielle Name des Amts oder der Dienststelle, nicht eine Einzelperson.",
    example: "Amt für Wirtschaft und Tourismus",
    input: "text",
  },
  {
    key: "contact_email",
    level: "mandatory",
    label: "An wen können sich Nutzende bei Fragen wenden?",
    dcat: "dcat:contactPoint / vcard:hasEmail",
    odsField: "DCAT → Kontakt-E-Mail",
    help: "Eine E-Mail-Adresse, die dauerhaft betreut wird — am besten ein Sammelpostfach statt einer persönlichen Adresse. Ohne E-Mail sind die Metadaten nicht standardkonform.",
    example: "opendata@awt.gr.ch",
    input: "email",
  },
  {
    key: "license_url",
    level: "mandatory",
    label: "Unter welchen Bedingungen dürfen die Daten genutzt werden?",
    dcat: "dct:license",
    odsField: "Standard → Lizenz-URL",
    help: "Wählen Sie eine der vier Schweizer Open-Data-Nutzungsbedingungen. Im Zweifel klärt das die datenverantwortliche Stelle.",
    input: "select",
    options: LICENSES,
  },
  {
    key: "theme",
    level: "mandatory",
    label: "Zu welchem Themenbereich gehören die Daten?",
    dcat: "dcat:theme",
    odsField: "Standard → Thema",
    help: "Ein bis zwei Themen aus der festen Liste — so finden Nutzende den Datensatz beim Stöbern im Portal.",
    input: "themes",
  },
  {
    key: "keyword_de",
    level: "recommended",
    label: "Mit welchen Stichworten würde man danach suchen?",
    dcat: "dcat:keyword",
    odsField: "Standard → Schlagworte (de)",
    help: "3–6 Begriffe, kleingeschrieben, jeweils ein Konzept. Auch Synonyme, die im Titel nicht vorkommen.",
    example: "camping, tourismus, logiernächte",
    input: "tags",
  },
  {
    key: "update_frequency",
    level: "recommended",
    label: "Wie oft werden die Daten aktualisiert?",
    dcat: "dct:accrualPeriodicity",
    odsField: "Standard → Aktualisierungsfrequenz",
    help: "Wie oft kommen neue Werte dazu? Wenn es keinen festen Rhythmus gibt: «Unregelmässig».",
    input: "select",
    options: FREQUENCIES,
  },
  {
    key: "temporal_coverage_start",
    level: "recommended",
    label: "Ab wann liegen Daten vor?",
    dcat: "dct:temporal (Beginn)",
    odsField: "DCAT → Zeitliche Abdeckung (Beginn)",
    help: "Das Datum der ältesten enthaltenen Werte, z. B. der 1. Januar des ersten Erhebungsjahrs.",
    example: "2008-01-01",
    input: "date",
  },
  {
    key: "temporal_coverage_end",
    level: "recommended",
    label: "Bis wann liegen Daten vor?",
    dcat: "dct:temporal (Ende)",
    odsField: "DCAT → Zeitliche Abdeckung (Ende)",
    help: "Leer lassen, wenn der Datensatz laufend weitergeführt wird.",
    input: "date",
  },
  {
    key: "spatial",
    level: "recommended",
    label: "Welches Gebiet decken die Daten ab?",
    dcat: "dct:spatial",
    odsField: "DCAT → Räumliche Abdeckung",
    help: "Zum Beispiel «Kanton Graubünden» oder eine Gemeinde. Fachleute können auch einen geonames-Link eintragen.",
    example: "Kanton Graubünden",
    input: "text",
  },
  {
    key: "references",
    level: "recommended",
    label: "Wo gibt es weiterführende Informationen?",
    dcat: "dct:references",
    odsField: "Standard → Verweise",
    help: "Ein Link auf die Methodik, die Erhebung oder die Fachseite — hilft Nutzenden, die Daten richtig zu interpretieren.",
    example: "https://www.bfs.admin.ch/…/pasta.html",
    input: "url",
  },
  {
    key: "attributions",
    level: "recommended",
    label: "Welche Quellen müssen genannt werden?",
    dcat: "dct:source / Attribution",
    odsField: "Standard → Quellenvermerke",
    help: "Name der Erhebung oder der liefernden Stelle, so wie er in einer Quellenangabe erscheinen soll.",
    example: "Parahotelleriestatistik (PASTA), Bundesamt für Statistik BFS",
    input: "tags",
  },
  {
    key: "contact_name",
    level: "recommended",
    label: "Wie heisst die Kontaktstelle?",
    dcat: "dcat:contactPoint / vcard:fn",
    odsField: "DCAT → Kontakt-Name",
    help: "Der Name des Teams oder der Dienststelle hinter der Kontakt-E-Mail.",
    example: "Abteilung Daten und Statistik",
    input: "text",
  },
  {
    key: "created",
    level: "optional",
    label: "Wann wurden die Daten erstellt?",
    dcat: "dct:created",
    odsField: "DCAT → Erstellt am",
    help: "Das Erstellungsdatum der Datensammlung (nicht der Publikation).",
    input: "date",
  },
  {
    key: "issued",
    level: "optional",
    label: "Wann wurden die Daten erstmals publiziert?",
    dcat: "dct:issued",
    odsField: "DCAT → Publiziert am",
    help: "Das Datum der Erstveröffentlichung im Portal.",
    input: "date",
  },
  {
    key: "contributor",
    level: "optional",
    label: "Welche weiteren Stellen haben mitgewirkt?",
    dcat: "dct:contributor",
    odsField: "DCAT → Mitwirkende",
    help: "Zum Beispiel ein Bundesamt, das die Rohdaten liefert.",
    example: "Bundesamt für Statistik BFS",
    input: "text",
  },
];

export const LEVEL_LABELS: Record<RequirementLevel, string> = {
  mandatory: "Pflicht",
  recommended: "Empfohlen",
  optional: "Optional",
};

export function fieldsByLevel(level: RequirementLevel): FieldDef[] {
  return FIELDS.filter((f) => f.level === level);
}

// ---------------------------------------------------------------------------
// Completeness score (rule-based stand-in for the later SHACL validation)
// ---------------------------------------------------------------------------

export function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export interface Completeness {
  /** 0–100; mandatory fields weigh 70 %, recommended 30 %. */
  score: number;
  mandatoryFilled: number;
  mandatoryTotal: number;
  recommendedFilled: number;
  recommendedTotal: number;
  missingMandatory: FieldDef[];
}

export function completeness(draft: MetadataDraft): Completeness {
  const mandatory = fieldsByLevel("mandatory");
  const recommended = fieldsByLevel("recommended");
  const mandatoryFilled = mandatory.filter((f) => isFilled(draft[f.key])).length;
  const recommendedFilled = recommended.filter((f) => isFilled(draft[f.key])).length;
  const score = Math.round(
    (mandatoryFilled / mandatory.length) * 70 +
      (recommendedFilled / recommended.length) * 30,
  );
  return {
    score,
    mandatoryFilled,
    mandatoryTotal: mandatory.length,
    recommendedFilled,
    recommendedTotal: recommended.length,
    missingMandatory: mandatory.filter((f) => !isFilled(draft[f.key])),
  };
}

// ---------------------------------------------------------------------------
// Mapping ODS `metas` ↔ MetadataDraft
// ---------------------------------------------------------------------------

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function strArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map((v) => String(v).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  return undefined;
}

function isoDate(value: unknown): string | undefined {
  const s = str(value);
  if (!s) return undefined;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Extract an editable draft from a full ODS `metas` object. */
export function fromOdsMetas(metas: Record<string, any>): MetadataDraft {
  const def = metas?.default ?? {};
  const dcat = metas?.dcat ?? {};
  const draft: MetadataDraft = {
    title_de: str(def.title_de) ?? str(def.title),
    description_de: str(def.description_de) ?? str(def.description),
    publisher_de: str(def.publisher_de) ?? str(def.publisher),
    contact_name: str(dcat.contact_name),
    contact_email: str(dcat.contact_email),
    license_url: str(def.license_url),
    theme: strArray(def.theme_de) ?? strArray(def.theme),
    keyword_de: strArray(def.keyword_de) ?? strArray(def.keyword),
    update_frequency:
      str(def.update_frequency)?.toLowerCase() ?? str(dcat.accrualperiodicity),
    temporal_coverage_start: isoDate(dcat.temporal_coverage_start),
    temporal_coverage_end: isoDate(dcat.temporal_coverage_end),
    spatial: str(dcat.spatial),
    references: str(def.references),
    attributions: strArray(def.attributions),
    created: isoDate(dcat.created),
    issued: isoDate(dcat.issued),
    contributor: str(dcat.contributor),
    title_it: str(def.title_it),
    title_en: str(def.title_en),
    description_it: str(def.description_it),
    description_en: str(def.description_en),
    keyword_it: strArray(def.keyword_it),
    keyword_en: strArray(def.keyword_en),
  };
  // Drop undefined keys so drafts stay compact in structuredContent.
  return Object.fromEntries(
    Object.entries(draft).filter(([, v]) => v !== undefined),
  ) as MetadataDraft;
}

/** Serialize a draft into the ODS `metas` template structure for handover. */
export function toOdsMetas(draft: MetadataDraft): Record<string, any> {
  const def: Record<string, any> = {
    title_de: draft.title_de,
    title_it: draft.title_it,
    title_en: draft.title_en,
    description_de: draft.description_de,
    description_it: draft.description_it,
    description_en: draft.description_en,
    publisher_de: draft.publisher_de,
    license_url: draft.license_url,
    theme: draft.theme,
    keyword_de: draft.keyword_de,
    keyword_it: draft.keyword_it,
    keyword_en: draft.keyword_en,
    update_frequency: draft.update_frequency?.toUpperCase(),
    references: draft.references,
    attributions: draft.attributions,
  };
  const dcat: Record<string, any> = {
    contact_name: draft.contact_name,
    contact_email: draft.contact_email,
    accrualperiodicity: draft.update_frequency,
    temporal_coverage_start: draft.temporal_coverage_start,
    temporal_coverage_end: draft.temporal_coverage_end,
    spatial: draft.spatial,
    created: draft.created,
    issued: draft.issued,
    contributor: draft.contributor,
  };
  const compact = (obj: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => isFilled(v)),
    );
  return { default: compact(def), dcat: compact(dcat) };
}

/** Human-readable German handover checklist for the ODS backoffice. */
export function toMarkdownChecklist(
  draft: MetadataDraft,
  source?: { label?: string },
): string {
  const lines: string[] = [
    `# Metadaten-Checkliste${source?.label ? ` — ${source.label}` : ""}`,
    "",
    "Werte der Reihe nach im Opendatasoft-Backoffice eintragen.",
    "",
  ];
  for (const level of ["mandatory", "recommended", "optional"] as const) {
    const fields = fieldsByLevel(level).filter((f) => isFilled(draft[f.key]));
    if (!fields.length) continue;
    lines.push(`## ${LEVEL_LABELS[level]}`, "");
    for (const field of fields) {
      const value = draft[field.key];
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      lines.push(`- [ ] **${field.odsField}**`, `  ${rendered}`, "");
    }
  }
  const missing = completeness(draft).missingMandatory;
  if (missing.length) {
    lines.push("## Noch offen (Pflicht!)", "");
    for (const field of missing) {
      lines.push(`- [ ] ${field.odsField} — ${field.label}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
