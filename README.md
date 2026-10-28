# xlf-google-translate

[![CI](https://github.com/bpatrik/xlf-google-translate/actions/workflows/ci.yml/badge.svg)](https://github.com/bpatrik/xlf-google-translate/actions/workflows/ci.yml)

Keeps Angular i18n XLIFF (`*.xlf`) translation files in sync with a freshly extracted source file.

> **Note:** despite the name, this tool no longer calls Google Translate (removed in v1.0.0-beta.22).
> Translations can be supplied through `translationMap` instead, e.g. from an AI translation step.

## Features

- **Merge:** reads the source `messages.xlf` (e.g. the output of `ng extract-i18n`) and writes
  `<filename>.<lang>.xlf` for every destination language. Existing translations from that file are kept,
  and new texts get their source text as target.
- **Translation map:** applies `{source, target, lang}` entries on top of the merged files.
- **Extract untranslated:** prints a JSON list of the units whose target is still the same as the source.
  You can translate the list and pass it back as `translationMap`.

Sources are matched by text, not by id. Whitespace differences are ignored, and with `formatOutput` a
trailing dot difference is ignored too.

## Usage

```bash
npm install --save-dev xlf-google-translate
```

```bash
xlf-google-translate --method="extend-only" --source-lang="en" --source-file="./locale.source.xlf" \
  --destination-filename="messages" --destination-folder="./src/translate" \
  --destination-languages='["hu","de"]'
```

To list what still needs translating:

```bash
xlf-google-translate --extractOriginalOnly=true --source-lang="hu" --source-file="./src/translate/messages.hu.xlf" > todo.json
```

In this mode only the JSON goes to stdout. Progress messages go to stderr.

The command exits with a non-zero code when the configuration is invalid or a file cannot be read or written.

### Configuration

Options come from [typeconfig](https://github.com/bpatrik/typeconfig): CLI switches (as above), environment
variables, or a `config.json` file (pass `--config-path=<file>` to pick its location; `--help` lists everything).

```jsonc
{
  "source": {
    "lang": "en",
    "file": "./locale.source.xlf"
  },
  "destination": {
    "folder": "./src/translate",
    "languages": ["hu", "de"],
    "filename": "messages"
  },
  // extend-only | extend: keep existing translations, rewrite: start from scratch
  "method": "extend-only",
  // collapse whitespace in targets and ignore trailing dot differences when matching
  "formatOutput": true,
  // only print untranslated entries as JSON, do not write anything
  "extractOriginalOnly": false,
  // translations applied on top of the merged files
  "translationMap": [
    {"source": "Apple", "target": "Alma", "lang": "hu"}
  ]
}
```

### Library

```ts
import {loadXml, mergeTranslations, writeXml, XLIFF} from 'xlf-google-translate';

const source: XLIFF.Root = await loadXml('locale.source.xlf');
const merged = mergeTranslations(source, await loadXml('messages.hu.xlf'));
await writeXml(merged, 'messages.hu.xlf');
```

Importing the library has no side effects. Only the CLI loads `config.json`.

## Development

```bash
npm install
npm test           # mocha + ts-node, no build needed
npm run lint
npm run typecheck
npm run build      # compiles src/ to dist/
```

## Known limitations

Sources that contain placeholders or inline elements (e.g. `<x id="INTERPOLATION"/>`) are not handled well.
