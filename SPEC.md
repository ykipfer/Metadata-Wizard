# SPEC — Metadata-Wizard

## Value Proposition

Datenbereitsteller des Kantons Graubünden (oft Laien ohne Metadaten-Erfahrung)
erstellen und verbessern DCAT-AP-CH-orientierte Metadaten für data.gr.ch —
geführt, in einfacher Sprache, mit Freigabe pro Feld. Das Host-Modell
(Claude/ChatGPT) generiert die Vorschläge; die App liefert Daten-Tools, die
Editor-View und den Export fürs Opendatasoft-Backoffice. Validierung (SHACL)
und Write-back sind bewusst ausserhalb des Scopes (siehe
`docs/IMPLEMENTATION_PLAN.md`, Phase 4).

## UX Flows

Bestehende Metadaten verbessern:
1. Datensatz nennen oder suchen (`search_datasets`)
2. Kontext laden (`load_dataset_context`), Host generiert verbesserten Entwurf
3. Editor öffnen: Diff pro Feld prüfen (Übernehmen/Ablehnen), frei editieren
4. Export-Schritt: Werte ins ODS-Backoffice kopieren

Neue Metadaten erstellen (Daten noch nicht publiziert):
1. Datei im Chat hochladen; Host extrahiert Schema und Beispielzeilen
2. Host generiert Entwurf, öffnet Editor ohne `existing`
3. Felder Schritt für Schritt vervollständigen (Pflicht → Empfohlen → Optional)
4. Export-Schritt

## Tools and Views

**Tool: search_datasets**
- Input: `{ search, limit? }`
- Output: `{ total_count, results[] }` (id, title, description, theme, publisher)
- Semantische Suche via ODS `vector_similarity_threshold` (filtert UND rankt;
  die API lehnt eine zusätzliche `vector_similarity`-Sortierung als «multiple
  score functions» ab)

**Tool: load_dataset_context**
- Input: `{ dataset_id }`
- Output: `{ dataset_id, portal_url, existing_draft, fields[], sample_records[], available_themes[] }`
- `existing_draft` enthält alle editierbaren Felder inkl. Sprachvarianten und
  wird unverändert als `existing` an den Editor weitergereicht; der rohe
  `metas`-Baum wird nicht zusätzlich zurückgegeben (Token-Sparsamkeit)

**View: show_metadata_editor** (`views/metadata-editor.tsx`)
- Input: `{ draft, existing?, source?, available_themes? }`
- Output (structuredContent): Input durchgereicht; die View liest ihn via `useToolInfo`
- Verhalten: Stepper (Pflicht/Empfohlen/Optional/Export), Diff nur wenn
  `existing` gesetzt, Vollständigkeits-Score, Fullscreen-Umschalter
  (`useDisplayMode`, nutzer-getriggert). Arbeitsstand liegt in `useViewState`
  (Modell sieht Edits), `data-llm` fasst Score und Lücken zusammen.
  Formularzustand lebt in der View — keine Feld-Update-Tools.
- Mehrsprachigkeit: Titel, Beschreibung und Schlagworte haben Sprach-Tabs
  de/it/en (de führend; data.gr.ch kennt keine `_rm`-Feldvarianten). Der
  aktive Tab ist ephemer (`useState`), die Werte liegen im Draft
  (`title_it`, `keyword_en`, …). Der Button «Übersetzung vorschlagen»
  triggert das Host-Modell via `useSendFollowUpMessage`: übersetzen und
  show_metadata_editor mit ergänztem Entwurf erneut aufrufen. Score und
  Pflicht-Badges folgen weiterhin nur den deutschen Werten; Export
  (Checkliste, Copy-Liste, JSON) enthält gefüllte Varianten.

**Tool: export_metadata**
- Input: `{ draft, source? }`
- Output: `{ json, markdown }` (ODS-`metas`-JSON + deutsche Checkliste)
- Für den Chat-Flow; die View berechnet den Export lokal aus demselben Modul
  (`src/metadata.ts`)

## Design Decisions

- **Generierung im Host-Modell**, kein LLM-Key im Backend (Entscheid im Plan).
- **Geteiltes Modell** `src/metadata.ts` (Server + View): Draft-Schema 1:1 auf
  ODS-`metas` gemappt, Feld-Definitionen mit laienverständlichen Fragen,
  Requirement-Levels, Vokabulare (opendata.swiss-Lizenzen, Frequenzen, Themen),
  regelbasierter Score als Vorstufe der späteren SHACL-Validierung.
- **Übernahme via Export/Copy**, kein Schreibzugriff aufs Portal.
- Bekanntes Framework-Verhalten: `useViewState` synchronisiert den Host im
  React-Updater, was im Dev-Modus eine «setState in render»-Warnung auslöst —
  kein Fehler unserer View.
