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

Its main consumer is pigallery2 (`../PiGallery2`, `gulpfile.ts`): it runs the CLI with
`--method=extend-only --source-lang --source-file --destination-filename --destination-folder --destination-languages`
switches and imports the `XLIFF` types with `moduleResolution: node`. Keep `main`/`types` and those switches working.

## Layout

| Path | Purpose |
| --- | --- |
| `src/cli.ts` | `bin` entry (`xlf-google-translate`, also `npm start`): loads `Config`, validates it with `resolveOptions`, calls `run()`, sets exit code 1 on failure. |
| `src/index.ts` | Library entry (`main`/`types`): re-exports the `XLIFF` types and the pure API. Must stay side-effect free: never import `Config` here. |
| `src/translator.ts` | Core logic: `run`, `mergeTranslations`, `applyTranslationMap`, `extractUntranslated`, `sourceEqual`/`normalizeSource`, `formatTarget`. |
| `src/options.ts` | `RunOptions` / `RawOptions` types and `resolveOptions` (validation + defaults). |
| `src/file.ts` | `loadXml` / `toXml` / `writeXml` via `xml2js`. |
| `src/XLIFF.ts` | TypeScript shape of the parsed XLIFF (`XLIFF.Root`, `TransUnit`, `Content`). |
| `src/config/Config.ts` | Config schema built with `typeconfig` decorators. |
| `test/*.spec.ts` | Mocha + Chai tests run through ts-node. `run.spec.ts` covers `run()` and the CLI using `test/assets/messages.hu.xlf`. |

## Commands

```bash
npm install
npm test           # mocha + ts-node on test/**/*.spec.ts (no build needed)
npm run typecheck  # tsc --noEmit over src and test
npm run lint       # eslint (flat config, eslint.config.mjs)
npm run lint:fix
npm run build      # tsc -p tsconfig.build.json: src/ -> dist/ (js, d.ts, source maps)
npm start          # node dist/cli.js; needs a build and config (CLI switches or config.json)
```

## Build and TypeScript

- `tsconfig.json` is the strict base config (editor, typecheck, ESLint, ts-node). Its `module` is `Node20` so tests can
  `require()` the ESM-only `chai`. `tsconfig.build.json` extends it with `Node16` and only includes `src/`.
- Output is CommonJS in `dist/` (git-ignored). Only `dist/` is published (`files` in package.json).
- `useDefineForClassFields: false` is required: typeconfig's property decorators break with [[Define]] class fields.
- `tslib` is a runtime dependency because typeconfig requires it without declaring it.

## Configuration

- `Config` (`src/config/Config.ts`) is loaded **at import time** (`Config.loadSync()`) from `config.json` in the package
  root (resolved relative to `dist/config/`, overridable with `--config-path=<file>`). It is created with defaults if
  missing (`saveIfNotExist`). `config.json` is git-ignored — never commit it. Only `src/cli.ts` imports `Config`.
- `typeconfig` also accepts overrides from CLI arguments and environment variables.
- Options: `source.{lang,file}`, `destination.{folder,languages,filename}`,
  `method` (`extend-only` | `extend` | `rewrite`), `formatOutput`, `extractOriginalOnly`,
  `translationMap: {source, target, lang}[]`. Validate new required options in `resolveOptions`.
- Core functions take options as parameters, so tests never touch `Config` or `config.json`.

## Code notes and gotchas

- Parsed XLIFF from `xml2js` is array-heavy: units live at `root.xliff.file[0].body[0]['trans-unit']`, and
  `source`/`target` are arrays whose first element is either a string or an object `{ _: string, ... }` (when the
  element has attributes). That string is the raw inner XML (`Deleted <x id="PH"/> photos`, entities kept escaped):
  `parseXml` escapes the inner XML before xml2js sees it and `toXml` swaps it back in through tokens. Text between
  inline elements is re-escaped canonically (`canonicalizeContent`, same escaping as xml2js's builder) so plain-text
  output stays byte-identical to older versions. Use the `getText` / `getTransUnits` helpers rather than indexing raw.
- `mergeTranslations` / `applyTranslationMap` return deep copies (`structuredClone`) and never mutate their inputs.
- Matching is by normalized source text (not by `id`) through a `Map`: whitespace is collapsed and, with `formatOutput`,
  one trailing `.` is ignored. Inline elements are compared by name and `id` only. `formatTarget` collapses whitespace
  outside inline elements and re-adds a trailing `.` if the (trimmed) source has one. It keeps a single leading or
  trailing space where the source has one: Angular keeps edge spaces that separate the text from inline template
  content, so trimming them can join words. Merging the tool's own output again must give the same result.
- With duplicate sources in the existing file, a real translation beats a target equal to the source; otherwise the
  last match wins (`extend-only`) or the first one (`extend`, via `firstMatchWins`). `rewrite` ignores the existing file.
- In `extractOriginalOnly` mode the CLI prints JSON to stdout and logs to stderr; keep stdout clean there.

## Style

- TypeScript (strict), CommonJS output, target ES2022, decorators enabled (needed by `typeconfig`).
- 2-space indent, UTF-8, final newline (`.editorconfig`). Single quotes; imports written as `{a, b}` without inner spaces.
- Code style is arrow-function exports and short `//` comments; match the surrounding code.
- `console.log` is the logging mechanism (this is a CLI); library functions take an optional `Logger` instead.
- Build output (`dist/`) is git-ignored; don't commit it.
- Add or update tests in `test/` when changing behavior.
- Avoid output churn: unchanged units must be written byte-identically, so PiGallery2's `messages.*.xlf` files only
  change where a change is intended. Before releasing an output change, merge PiGallery2's `locale.source.xlf` into
  copies of its `src/frontend/translate/messages.*.xlf` with the old and new build and review the diff.

## Keeping this file current

- When the repo owner (Patrik J. Braun) tells you something new about the project — a convention, preference,
  correction, workflow or gotcha that is not already captured here — update this `AGENTS.md` accordingly, so
  future agents (and Claude Code via `CLAUDE.md`) pick it up.
- Keep edits concise, put them in the relevant section, and fix or remove anything here that turns out to be wrong.
- `AGENTS.md` is the single source of truth; `CLAUDE.md` only imports it, so don't add content to `CLAUDE.md`.
