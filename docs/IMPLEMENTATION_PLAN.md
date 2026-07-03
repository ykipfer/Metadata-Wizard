# Implementierungsplan: Metadata-Wizard — MCP App für Metadaten-Generierung (DCAT-AP CH)

**Status:** Entwurf, genehmigt zur Umsetzung · **Datum:** 2026-07-03

## Kontext und Ziel

Der Kanton Graubünden betreibt das Open-Data-Portal **data.gr.ch** auf der Opendatasoft-Plattform. Datenbereitsteller in den Ämtern sind häufig Laien ohne Erfahrung mit Metadaten-Standards. Der **Metadata-Wizard** ist eine MCP App (Model Context Protocol, MCP-Apps-Extension), die zwei Aufgaben löst:

1. **Generierung**: Vollständige, DCAT-AP-CH-orientierte Metadaten für neue, noch nicht publizierte Datensätze erzeugen — aus einer hochgeladenen Datei (CSV/Excel) oder einer Beschreibung des Nutzers.
2. **Verbesserung**: Bestehende Metadaten von data.gr.ch-Datensätzen analysieren und konkrete Verbesserungsvorschläge machen, die der Nutzer Feld für Feld übernehmen oder ablehnen kann.

Die **Validierung gegen DCAT-AP CH (SHACL/pySHACL) ist bewusst ausgeklammert**. Die Architektur sieht sie als spätere Andockstelle vor (siehe Phase 4), erzwingt aber keine Abhängigkeit darauf.

Grundlage ist die Research-Analyse «MCP-App für Metadaten-Generierung, -Verbesserung und DCAT-AP CH Validierung» (SkyBridge-Framework, MCP-Apps-Extension SEP-1865, eCH-0200, Opendatasoft-Plattform-Kontext).

### Getroffene Grundsatzentscheide

| Entscheid | Wahl | Begründung |
|---|---|---|
| LLM-Generierung | **Host-Modell** (Claude/ChatGPT) | Die App trennt Daten-Tools (Kontext laden) von Render-Tools (UI anzeigen); das Host-Modell generiert Beschreibungen, Keywords und Übersetzungen selbst. Kein API-Key, keine LLM-Kosten im Backend, Standard-Muster der MCP Apps. |
| Datenquellen | **Portal + neue Daten** | Verbesserung bestehender data.gr.ch-Datensätze und Generierung für hochgeladene, noch nicht publizierte Daten. |
| Übernahme | **Export/Copy** | Copy-Buttons pro Feld plus Export als JSON/Markdown-Vorlage fürs Opendatasoft-Backoffice. Kein Schreibzugriff aufs Portal; ein Data Steward pflegt die Werte manuell ein. |

### Verifizierter API-Befund (Live-Abfrage data.gr.ch, Juli 2026)

Die Opendatasoft Explore API (`/api/explore/v2.1`) liefert pro Datensatz deutlich mehr Metadaten, als der bestehende `mcp-data-gr`-Server heute durchreicht:

- `metas.default`: mehrsprachige Varianten (`title_de/_it/_en`, `description_*`, `keyword_*`, `theme_*`, `publisher_*`), `license` + `license_url`, `update_frequency`, `references`, `attributions`, `metadata_languages`
- `metas.dcat`: `contact_name`, **`contact_email`**, `accrualperiodicity`, `spatial`, `temporal_coverage_start/end`, `created`, `issued`, `contributor`, `accessRights`, `publisher_type`
- `metas.dcat_ap_ch`: `rights`, `license`
- `metas.custom`: portalspezifische Felder (z. B. `quellenangabe`)

Diese Felder sind das Rohmaterial des Wizards. Referenz-Datensatz für Tests: `dvs_awt_econ_202503310` (Campingplätze nach Tourismusregionen, viersprachig gepflegt).

---

## 1. Zielarchitektur

```
Claude / ChatGPT (MCP-Host — generiert Texte/Keywords/Übersetzungen selbst)
      │  MCP (tools + views, @modelcontextprotocol/ext-apps)
      ▼
Metadata-Wizard = SkyBridge MCP-App (TypeScript/React, Express)
   ├─ Daten-Tools (ohne View):
   │    search_datasets      ──► Katalogsuche für die Datensatz-Auswahl
   │    load_dataset_context ──► ODS Explore API data.gr.ch (direkt)
   ├─ Render-Tools (mit React-View):
   │    show_metadata_editor ──► Editor-/Diff-View (Entwurf vom Host als Input)
   ├─ Export-Tool: export_metadata (JSON + Markdown-Vorlage fürs ODS-Backoffice)
   └─ [Andockstellen später: validate_dcatapch (pySHACL-Microservice),
       apply_metadata (ODS Automation API)]
```

Leitplanken:

- **SkyBridge** (`alpic-ai/skybridge`, aktuell v1.2.3, MIT) als Framework: `registerTool` mit zod-Schema und typsicherem `view.component`, React-Hooks (`useToolInfo`, `useRegisterViewTool`, `callTool`), Emulator/HMR für die lokale Entwicklung. Läuft in Claude, ChatGPT und VS Code.
- Die App ist **selbstständig**: Das Express-Backend spricht die ODS Explore API direkt an (öffentliche API, kein Key nötig). Es gibt keinen MCP-zu-MCP-Aufruf. Der bestehende `mcp-data-gr`-Connector bleibt der generische Datenzugriffs-Server und wird komplementär verbessert (Kapitel 6).
- **Muster «Daten-Tool vor Render-Tool»** (aus den Apps-SDK-Docs): Ein Daten-Tool liefert den Kontext als `structuredContent`, der Host «denkt» (generiert den Entwurf), dann rendert ein separates Render-Tool die UI. Das verhindert unnötiges Re-Rendering und hält die Generierung beim Host-Modell. View↔Host-Synchronisation über Widget-State und `ui/update-model-context`.

## 2. Metadaten-Modell (Feldset, ODS ↔ DCAT-AP CH gemappt)

Das UI arbeitet auf einem flachen, versionierbaren Entwurfs-Objekt (`MetadataDraft`), dessen Schlüssel direkt auf die ODS-`metas`-Struktur mappen — so bleibt der Export trivial und ein späterer Write-back möglich.

| Stufe | Felder (ODS-Schlüssel) | DCAT-AP-CH-Entsprechung |
|---|---|---|
| **Pflicht** | Titel `title_de`, Beschreibung `description_de`, Herausgeber `publisher_de`, Kontakt-E-Mail `dcat.contact_email`, Lizenz `license_url`, Thema `theme` | `dct:title`, `dct:description`, `dct:publisher`, `dcat:contactPoint`/`vcard:hasEmail` (ab eCH-0200 v3 zwingend!), `dct:license`, `dcat:theme` |
| **Empfohlen** | Keywords `keyword_de`, Frequenz `update_frequency`/`dcat.accrualperiodicity`, zeitliche Abdeckung `dcat.temporal_coverage_start/end`, räumliche Abdeckung `dcat.spatial`, Quellen `references`/`attributions`, weitere Sprachen (it/rm/en) | `dcat:keyword`, `dct:accrualPeriodicity`, `dct:temporal`, `dct:spatial`, `dct:source`/`dct:relation`, Mehrsprachigkeitsanforderung |
| **Optional** | `dcat.created`, `dcat.issued`, `dcat.contributor`, `dcat.publisher_type`, `dcat.accessRights`, `custom.quellenangabe` | `dct:created`, `dct:issued`, `dct:contributor`, `dct:accessRights` |

Kontrollierte Werte werden als **Dropdowns** angeboten, nicht als Freitext:

- **Themen**: aus den Katalog-Facetten von data.gr.ch geladen (konsistent zum Portal).
- **Frequenz**: Subset des EU-Frequenz-Vokabulars (`annual`, `monthly`, `weekly`, `daily`, `irregular`, …) — die Werte, die ODS akzeptiert.
- **Lizenzen**: die opendata.swiss Terms-of-Use-Liste (`terms_open`, `terms_by`, `terms_ask`, `terms_by_ask`) mit Klartext-Erklärung je Option.

Ein regelbasierter **Vollständigkeits-Score** (Pflichtfelder = rot/grün, empfohlene Felder = Bonuspunkte) ersetzt vorerst die SHACL-Validierung. Der Score-Bereich der View ist so geschnitten, dass er später den echten SHACL-Report (Violation/Warning/Info) aufnehmen kann, ohne das Layout zu ändern.

## 3. UX-Konzept für Laien (Kernanforderung)

Die UI ist für Menschen gebaut, die zum ersten Mal Metadaten erfassen:

- **Geführter Wizard (Stepper)**: ① Datensatz wählen bzw. Daten beschreiben → ② Entwurf ansehen → ③ Feld für Feld prüfen → ④ Exportieren. Immer nur ein Schritt sichtbar, jederzeit vor/zurück.
- **Einfache Sprache statt DCAT-Jargon**: Die UI fragt «Wie oft werden die Daten aktualisiert?» statt `dct:accrualPeriodicity` zu zeigen. Der Fachbegriff erscheint nur als dezenter Tooltip für Fortgeschrittene.
- **Hilfe und Beispiele pro Feld**: kurzer Hilfetext plus Gut/Schlecht-Beispiel («Eine gute Beschreibung nennt Inhalt, Zeitraum, Quelle und Einheiten — nicht nur den Titel in anderen Worten»).
- **Badges Pflicht/Empfohlen/Optional** mit Ampelfarben und ein Fortschrittsbalken (Vollständigkeits-Score) statt einer abschreckenden Fehlerliste.
- **Diff-Ansicht im Verbesserungsmodus**: Bestand und Vorschlag nebeneinander, «Übernehmen»/«Ablehnen» pro Feld, freies Editieren jederzeit möglich. Unveränderte Felder werden zusammengeklappt.
- **Chat-Kopplung**: Der Nutzer kann im Chat sagen «mach die Beschreibung kürzer» oder «formuliere das weniger technisch» — der Host generiert neu und ruft das Render-Tool mit aktualisiertem Entwurf auf. Die View meldet manuelle Feldänderungen via `ui/update-model-context` zurück, damit das Host-Modell immer den aktuellen Stand kennt.
- **Mehrsprachigkeit**: Deutsch führend, Tabs für Italienisch/Rätoromanisch/Englisch, Button «Übersetzung vorschlagen» (das Host-Modell übersetzt, der Nutzer prüft).
- **Abschluss**: Copy-Button pro Feld plus «Alles exportieren» — JSON in ODS-`metas`-Struktur für technische Nutzer und eine menschenlesbare Markdown-Checkliste zum Abarbeiten im Opendatasoft-Backoffice.

## 4. MCP-Tools der App (SkyBridge `registerTool`)

1. **`search_datasets`** (Daten-Tool, ohne View): Semantische Katalogsuche auf data.gr.ch (`vector_similarity_threshold`, analog `get_datasets` in mcp-data-gr). Liefert eine kompakte Trefferliste für die Auswahl in Schritt ①.
2. **`load_dataset_context`** (Daten-Tool, ohne View): `dataset_id` → vollständiger `metas`-Baum (alle Templates und Sprachvarianten), Feldschema (Name, Typ, Beschreibung), ~20 Beispielzeilen und ein Facetten-Auszug als `structuredContent`. Das ist die Grundlage, auf der das Host-Modell Beschreibungen, Keywords und Themenvorschläge generiert.
3. **`show_metadata_editor`** (Render-Tool mit React-View, zod-Schema): Input = Metadaten-Entwurf (`MetadataDraft`, Feldset aus Kap. 2) + optional Bestandsmetadaten (aktiviert den Diff-Modus) + Quellinfo (`dataset_id` oder `"upload"` mit Dateiname). View = Wizard/Editor aus Kapitel 3.
4. **`export_metadata`** (Tool, aus der View via `callTool` aufrufbar): finaler Editor-Zustand → JSON (ODS-`metas`-Struktur) + Markdown-Vorlage.

**Flow «Verbesserung»**: Nutzer nennt einen Datensatz (oder sucht via `search_datasets`) → Host ruft `load_dataset_context` → Host generiert Verbesserungsvorschläge → `show_metadata_editor(draft, existing)` → Nutzer entscheidet pro Feld → Export.

**Flow «Neu»**: Nutzer lädt CSV/Excel im Chat hoch → Host extrahiert Schema und Beispielzeilen → Host generiert vollständigen Entwurf → `show_metadata_editor(draft)` → Nutzer ergänzt (v. a. Kontakt, Lizenz, Frequenz) → Export.

## 5. Implementierungsphasen

| Phase | Inhalt | Aufwand |
|---|---|---|
| **0 — Scaffold** | `npm create skybridge@latest`, Repo-Struktur, Emulator/HMR lauffähig, ODS-Client-Modul im Backend (Retry/Timeout/429-Handling nach dem Muster von `mcp-data-gr/main.py`) | ~1 Tag |
| **1 — Verbesserungs-MVP** | `load_dataset_context` + `show_metadata_editor` mit Diff-Ansicht für einen echten Datensatz (`dvs_awt_econ_202503310`), Übernehmen/Ablehnen pro Feld, JSON-Export. **Erfolgskriterium**: kompletter Verbesserungs-Durchlauf in Claude. | 1–2 Wochen |
| **2 — Neu-Generierung + Score** | Upload-Flow (Entwurf ohne Bestand), regelbasierter Vollständigkeits-Score, Dropdowns mit kontrollierten Werten (Themen/Frequenz/Lizenz), `search_datasets` | ~1 Woche |
| **3 — Mehrsprachigkeit + Polish** | Sprach-Tabs (de/it/rm/en), Übersetzungsvorschläge, Hilfetexte und Beispiele finalisieren, Markdown-Export, Copy-Buttons, **Usability-Test mit 2–3 Laien** | ~1 Woche |
| **4 — vorgemerkt, außerhalb Scope** | `validate_dcatapch` (FastAPI-Microservice mit pySHACL + `ogdch.shacl.ttl` aus `opendata-swiss/ogdch_checker`), Write-back via ODS Automation API (`apply_metadata`) | — |

## 6. Vorgeschlagene Anpassungen an mcp-data-gr

Der Wizard selbst ist autark. Die folgenden Anpassungen sorgen dafür, dass das Host-Modell **im selben Chat** Metadaten-Arbeit vorbereiten kann (Katalog-Screening, Kontext beschaffen), wofür heute Felder fehlen — priorisiert:

1. **Vollständige Metadaten zugänglich machen** (wichtigste Änderung): Neues Tool `get_dataset_metadata(dataset_id)` — oder ein Parameter `full_metadata: bool` an `get_dataset` (`main.py:207`) — das den kompletten `metas`-Baum ungekürzt zurückgibt: alle Templates (`default`, `dcat`, `dcat_ap_ch`, `custom`) und alle Sprachvarianten, die Beschreibung **ohne** die `_strip_html`-Kürzung auf 2000 Zeichen (`main.py:95-97, 226`). Heute fehlen komplett: Kontakt-E-Mail, Lizenz, Aktualisierungsfrequenz, zeitliche/räumliche Abdeckung, `references`, `attributions` und sämtliche Sprachvarianten — alles Kernfelder des Wizards. Für die Diff-Ansicht ist zudem der ungekürzte Original-Beschreibungstext zwingend.
2. **Katalog-Screening ermöglichen**: `_simplify_dataset` (`main.py:100-114`) in `get_datasets` um `license_url`, `update_frequency`, `metadata_languages` und die Beschreibungs-Länge ergänzen. Damit lassen sich Fragen wie «welche Datensätze haben lückenhafte Metadaten?» ohne N Einzelabfragen beantworten.
3. **Optional (für die spätere Validierung)**: `dcat_ap_ch` als Format in `export_catalog_url` zulassen (`/api/v2/catalog/exports/dcat_ap_ch`) — der native DCAT-AP-CH-RDF-Export von Opendatasoft, den auch opendata.swiss harvestet.
4. **Skill aktualisieren**: `skills/ogd-graubuenden.skill` um den Metadaten-Workflow und das neue Tool ergänzen, damit Agenten den vorgesehenen Ablauf (erst vollständige Metadaten laden, dann Wizard rendern) kennen.

## 7. Verifikation

- **Lokal**: SkyBridge-Emulator mit HMR (`pnpm dev`); MCP Inspector gegen den Express-Endpoint für Tool-Schemas und `structuredContent`.
- **End-to-End in Claude**:
  - (a) Verbesserungs-Flow mit einem realen data.gr.ch-Datensatz — die Diff-Ansicht zeigt den Bestand korrekt inklusive aller Sprachvarianten;
  - (b) Neu-Flow mit einer hochgeladenen CSV — ein Laie erreicht in einer geführten Session einen Export mit 100 % ausgefüllten Pflichtfeldern.
- **Export-Abgleich**: Das Export-JSON stichprobenartig gegen die `metas`-Struktur eines echten Datensatzes aus der ODS-API abgleichen (Schlüssel und Sprach-Suffixe identisch).

## Risiken und Caveats

- **SkyBridge ist jung** (v1.x): API-Änderungen möglich; Versionen pinnen und Release-Notes verfolgen.
- **Standard in Bewegung**: eCH-0200 v3 ist genehmigt, produktiv validiert opendata.swiss aber noch weitgehend gegen v2. Das Feldset in Kapitel 2 ist v3-tauglich gewählt (Kontakt-E-Mail als Pflicht), ohne v2 zu verletzen.
- **Plattform-Migration**: opendata.swiss/I14Y werden zu einer Piveau-basierten Lösung (metadata.swiss) zusammengeführt (geplant 2026). Betrifft primär die ausgeklammerte Validierung, nicht die Generierung.
- **LLM-Qualität**: Generierte Texte sind Vorschläge; die Freigabe pro Feld durch den Menschen ist fester Bestandteil des Flows (Forschung zeigt ~80–88 % Akzeptanz, nie 100 %).
- **ODS-Eigenheiten**: `description` erlaubt nur Plaintext (kein HTML); URLs erscheinen teils als Markdown — beim Anzeigen und Exportieren berücksichtigen.
