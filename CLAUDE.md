# Metadata-Wizard — Hinweise für Coding-Agents

## Arbeitsweise

- Für alle SkyBridge-Arbeiten (Tools, Views, State, Deploy) IMMER den Skill
  `chatgpt-app-builder` (`.claude/skills/chatgpt-app-builder/`) verwenden.
- `SPEC.md` beschreibt Flows und API der App — bei Änderungen aktuell halten.

## Coding-Prinzipien (verbindlich für alle Änderungen)

- **YAGNI**: Nur bauen, was der aktuelle Phasen-Scope (`docs/IMPLEMENTATION_PLAN.md`)
  tatsächlich braucht. Keine Vorrats-Abstraktionen, keine Konfigurierbarkeit ohne
  konkreten zweiten Anwendungsfall, keine "für später"-Features.
- **Einfachste Lösung zuerst**: Ein Ausdruck/One-Liner statt Helper-Funktion, wenn er
  lesbar bleibt. Ein Helper erst ab dem zweiten Nutzer. Kein `export` für Symbole,
  die nur in der eigenen Datei verwendet werden.
- **Totes Gewicht entfernen**: Ungenutzte Exports, Parameter, Metadaten und
  Codepfade werden gelöscht, nicht auskommentiert oder "sicherheitshalber" behalten.
- Explizites, langweiliges Mapping ist besser als clevere Indirektion (z. B. die
  Feld-Mappings in `src/metadata.ts` bewusst ausgeschrieben lassen).

## Projekt-Kurzkontext

- SkyBridge-MCP-App (TypeScript/React) für data.gr.ch (Opendatasoft).
- Das Host-Modell (Claude/ChatGPT) generiert Metadaten-Entwürfe; die App liefert
  Daten-Tools (`search_datasets`, `load_dataset_context`), die Editor-View
  (`show_metadata_editor`) und den Export (`export_metadata`).
- `src/metadata.ts` ist das geteilte Modell (Server + View): Draft-Schema 1:1 auf
  die ODS-`metas`-Struktur gemappt, Feld-Definitionen, Vokabulare, Score, Export.
- Verifikation: `npm run build && npx tsc --noEmit`; funktional über den
  Playground (`npm run dev`, http://localhost:3000) gegen das echte Portal.
