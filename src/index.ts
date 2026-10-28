// Library entry point; importing it has no side effects (config is only loaded by the CLI)
export {XLIFF} from './XLIFF';
export {loadXml, toXml, writeXml} from './file';
export {Logger, Method, METHODS, RawOptions, resolveOptions, RunOptions, TranslationMapEntry} from './options';
export {
  applyTranslationMap,
  extractUntranslated,
  formatTarget,
  getText,
  getTransUnits,
  mergeTranslations,
  MergeOptions,
  normalizeSource,
  run,
  RunResult,
  sourceEqual
} from './translator';
