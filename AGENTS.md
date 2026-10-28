# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repository.

## What this project is

`xlf-google-translate` is a small Node.js/TypeScript CLI that processes Angular i18n XLIFF (`*.xlf`) files.
It reads a source `messages.xlf`, and for each configured destination language writes `<filename>.<lang>.xlf`,
reusing translations that already exist in that destination file.

Despite the name, **it no longer calls Google Translate** (removed in v1.0.0-beta.22; see README). Today it is used to:

- **Merge/extend** existing translations into a freshly extracted source file (`method: "extend-only"`).
- **Apply a translation map** (`translationMap` config) — e.g. translations produced by an AI — onto the output files.
- **Extract untranslated entries** (`extractOriginalOnly: true`) — prints a JSON list of units whose `target` equals
  `source`, so they can be translated externally and fed back in via `translationMap`.

## Layout

| Path | Purpose |
| --- | --- |
| `cli.ts` | `bin` entry (`xlf-google-translate`); calls `run()` directly (no config validation). |
| `src/index.ts` | `npm start` entry; validates required config, then calls `run()`. |
| `src/translator.ts` | All core logic: `run`, `mergerTranslationJson`, `translateJson` (deprecated), `applyTranslationMap`, `sourceEqual`, `copySourceToTarget`. |
| `src/file.ts` | `loadXml` / `writeXml` via `xml2js`. |
| `src/XLIFF.ts` | TypeScript shape of the parsed XLIFF (`XLIFF.Root`). |
| `src/config/Config.ts` | Config schema built with `typeconfig` decorators. |
| `index.ts` | Library export (only the `XLIFF` types). |
| `test/translator.spec.ts` | Mocha + Chai tests. |

## Commands

```bash
npm install
npm run build      # tsc — compiles .ts to .js next to the sources (no outDir)
npm test           # runs build first (pretest), then mocha on the compiled test/*.js
npm run lint       # eslint (flat config, eslint.config.mjs)
npm run lint:fix
npm start          # node src/index.js — requires a build and a config.json
```

Always run `npm run build` before `npm start` or mocha; nothing runs from `.ts` directly.

## Configuration

- `Config` (`src/config/Config.ts`) is loaded **at import time** (`Config.loadSync()`) from `config.json` in the
  repo root (resolved relative to the compiled `src/config/` directory). It is created with defaults if missing
  (`saveIfNotExist`). `config.json` is git-ignored — never commit it.
- `typeconfig` also accepts overrides from CLI arguments and environment variables.
- Options: `source.{lang,file}`, `destination.{folder,languages,filename}`,
  `method` (`extend-only` | `extend` | `rewrite`), `formatOutput`, `extractOriginalOnly`,
  `translationMap: {source, target, lang}[]`.
- Because tests import `Config`, running tests also reads/creates `config.json`. Tests mutate `Config.formatOutput`
  directly — keep that in mind when adding tests that depend on config state.

## Code notes and gotchas

- Parsed XLIFF from `xml2js` is array-heavy: units live at `root.xliff.file[0].body[0]['trans-unit']`, and
  `source`/`target` are arrays whose first element is either a string or an object `{ _: string, ... }` (when the
  element has attributes or inline children). Use the `getFirstText` / `getTransUnits` helpers rather than indexing raw.
- `sourceEqual` collapses all whitespace before comparing; with `formatOutput` it also ignores a trailing `.` mismatch.
  `trimTarget` collapses whitespace in the target and re-adds a trailing `.` if the source has one.
- Matching is a nested O(n·m) loop over source and base units by source text (not by `id`). Later matches win in
  `mergerTranslationJson`; the first match wins in `translateJson`.
- `translateJson` is deprecated: for units without an existing base translation it no longer translates anything.
  Prefer `extend-only` + `translationMap` for new work.
- Known limitation: sources containing interpolation/placeholders (`<x id=.../>`) are not handled well.
- `cli.ts` skips the validation done in `src/index.ts`; keep them in sync if you add required options.
- Legacy files: `tslint.json` and `.travis.yml` are stale (ESLint and modern Node are what's actually used).

## Style

- TypeScript, CommonJS, target ES2015, `noImplicitAny`, decorators enabled (needed by `typeconfig`).
- 2-space indent, UTF-8, final newline (`.editorconfig`). Single quotes; imports written as `{a, b}` without inner spaces.
- Code style is arrow-function exports and short `//` comments; match the surrounding code.
- `console.log` is the logging mechanism (this is a CLI).
- Compiled `.js`, `.js.map` and `.d.ts` files are git-ignored; don't commit build output.
- Add or update tests in `test/translator.spec.ts` when changing `translator.ts` behavior.
