import { McpServer } from "skybridge/server";
import { z } from "zod";
import {
  DEFAULT_THEMES,
  completeness,
  fromOdsMetas,
  metadataDraftSchema,
  toMarkdownChecklist,
  toOdsMetas,
} from "./metadata.js";
import { DOMAIN, escapeOdsql, odsFetch, stripHtml } from "./ods.js";

const sourceSchema = z
  .object({
    type: z.enum(["dataset", "upload"]).describe(
      "'dataset' for an existing data.gr.ch dataset, 'upload' for a file provided in chat",
    ),
    id: z.string().optional().describe("Dataset id on data.gr.ch (type 'dataset')"),
    label: z
      .string()
      .optional()
      .describe("Human-readable label, e.g. the dataset title or file name"),
  })
  .describe("Where the data behind this draft comes from");

function trimRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      typeof value === "string" && value.length > 120
        ? `${value.slice(0, 120)}…`
        : value,
    ]),
  );
}

async function fetchThemes(): Promise<string[]> {
  try {
    const data = await odsFetch("/catalog/facets", { facet: "theme", lang: "de" });
    const facet = (data.facets ?? []).find((f: any) => f.name === "theme");
    const themes = (facet?.facets ?? []).map((v: any) => String(v.name));
    return themes.length ? themes : DEFAULT_THEMES;
  } catch {
    return DEFAULT_THEMES;
  }
}

const server = new McpServer(
  {
    name: "metadata-wizard",
    version: "0.1.0",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "search_datasets",
      description:
        `Search the ${DOMAIN} open-data catalog by meaning (semantic search). ` +
        "Use this to find the dataset the user wants to improve metadata for, " +
        "then call load_dataset_context with the chosen dataset_id.",
      inputSchema: {
        search: z.string().describe("Natural-language search query"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
      },
      annotations: {
        title: "Datensätze suchen",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ search, limit }) => {
      const query = escapeOdsql(search.trim());
      // vector_similarity_threshold both filters and ranks by relevance; the
      // API rejects combining it with an additional vector_similarity order_by
      // ("multiple score functions").
      const data = await odsFetch("/catalog/datasets", {
        limit: limit ?? 10,
        lang: "de",
        where: `vector_similarity_threshold("${query}")`,
      });
      const results = (data.results ?? []).map((d: any) => {
        const def = d.metas?.default ?? {};
        return {
          dataset_id: d.dataset_id,
          title: def.title_de ?? def.title,
          description: stripHtml(String(def.description_de ?? def.description ?? "")).slice(0, 300),
          theme: def.theme_de ?? def.theme,
          publisher: def.publisher_de ?? def.publisher,
          modified: def.modified,
        };
      });
      return {
        structuredContent: { total_count: data.total_count, results },
        content: [
          {
            type: "text",
            text: results.length
              ? results
                  .map((r: any) => `- ${r.dataset_id}: ${r.title}`)
                  .join("\n")
              : "Keine passenden Datensätze gefunden.",
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "load_dataset_context",
      description:
        `Load everything needed to generate or improve metadata for a ${DOMAIN} dataset: ` +
        "the complete existing metadata (all templates and language variants), the field " +
        "schema, sample records, and the portal theme list. Call this FIRST. Then generate " +
        "an improved metadata draft yourself (title, description, keywords, themes, … in " +
        "German, plain text) and open the editor via show_metadata_editor, passing your " +
        "draft as `draft` and the returned `existing_draft` unchanged as `existing`.",
      inputSchema: {
        dataset_id: z.string().describe("Dataset id, e.g. dvs_awt_econ_202503310"),
      },
      annotations: {
        title: "Datensatz-Kontext laden",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ dataset_id }) => {
      const [dataset, records, themes] = await Promise.all([
        odsFetch(`/catalog/datasets/${encodeURIComponent(dataset_id)}`, { lang: "de" }),
        odsFetch(`/catalog/datasets/${encodeURIComponent(dataset_id)}/records`, {
          limit: 20,
        }),
        fetchThemes(),
      ]);
      const existingDraft = fromOdsMetas(dataset.metas ?? {});
      const check = completeness(existingDraft);
      const summary = [
        `Datensatz ${dataset_id} («${existingDraft.title_de ?? "ohne Titel"}») geladen.`,
        `Vollständigkeit der bestehenden Metadaten: ${check.score} % ` +
          `(${check.mandatoryFilled}/${check.mandatoryTotal} Pflichtfelder, ` +
          `${check.recommendedFilled}/${check.recommendedTotal} empfohlene Felder).`,
        check.missingMandatory.length
          ? `Fehlende Pflichtangaben: ${check.missingMandatory.map((f) => f.label).join(" · ")}`
          : "Alle Pflichtangaben sind vorhanden.",
        "Erzeuge nun einen verbesserten Entwurf und öffne show_metadata_editor mit draft + existing.",
      ].join("\n");
      return {
        // existing_draft already carries every editable field (incl. language
        // variants), so the raw `metas` tree is not repeated here.
        structuredContent: {
          dataset_id,
          portal_url: `https://${DOMAIN}/explore/dataset/${encodeURIComponent(dataset_id)}/`,
          existing_draft: existingDraft,
          fields: (dataset.fields ?? []).map((f: any) => ({
            name: f.name,
            type: f.type,
            label: f.label,
            description: f.description,
          })),
          sample_records: ((records.results ?? []) as Record<string, unknown>[]).map(
            trimRecord,
          ),
          available_themes: themes,
        },
        content: [{ type: "text", text: summary }],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "show_metadata_editor",
      description:
        "Open the interactive metadata editor for the user. Pass your generated or " +
        "improved metadata as `draft` (German, plain text). For an existing dataset also " +
        "pass the unchanged `existing_draft` from load_dataset_context as `existing` — " +
        "this enables the side-by-side diff so the user can accept or reject each " +
        "suggestion. For new, not yet published data (e.g. a file uploaded in chat), " +
        "derive the draft from its structure and sample rows, omit `existing`, and set " +
        "source to {type: 'upload', label: '<file name>'}. The user reviews, edits and " +
        "exports the result in the view; the current state of their edits is shared " +
        "back with you automatically.",
      inputSchema: {
        draft: metadataDraftSchema.describe("The proposed metadata draft"),
        existing: metadataDraftSchema
          .optional()
          .describe("Current metadata of an existing dataset (enables diff mode)"),
        source: sourceSchema.optional(),
        available_themes: z
          .array(z.string())
          .optional()
          .describe("Theme list from load_dataset_context (falls back to the standard list)"),
      },
      annotations: {
        title: "Metadaten-Editor öffnen",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Öffne den Metadaten-Editor…",
        "openai/toolInvocation/invoked": "Metadaten-Editor bereit.",
      },
      view: {
        component: "metadata-editor",
        description: "Geführter Editor zum Prüfen und Übernehmen von Metadaten",
      },
    },
    async ({ draft, existing, source, available_themes }) => {
      const check = completeness(draft);
      return {
        structuredContent: {
          draft,
          existing: existing ?? null,
          source: source ?? null,
          availableThemes: available_themes?.length ? available_themes : DEFAULT_THEMES,
        },
        content: [
          {
            type: "text",
            text:
              `Editor geöffnet (Vollständigkeit des Entwurfs: ${check.score} %). ` +
              "Der Nutzer prüft die Vorschläge jetzt Feld für Feld.",
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "export_metadata",
      description:
        "Turn a finished metadata draft into handover artifacts: a JSON object in the " +
        "Opendatasoft `metas` structure and a human-readable German checklist for the " +
        "ODS backoffice. Call this when the user asks for the final result in chat.",
      inputSchema: {
        draft: metadataDraftSchema.describe("The final metadata draft"),
        source: sourceSchema.optional(),
      },
      annotations: {
        title: "Metadaten exportieren",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ draft, source }) => {
      const json = JSON.stringify(toOdsMetas(draft), null, 2);
      const markdown = toMarkdownChecklist(draft, source);
      return {
        structuredContent: { json, markdown },
        content: [{ type: "text", text: markdown }],
        isError: false,
      };
    },
  );

export default await server.run();

export type AppType = typeof server;
