import {promises as fsp} from 'fs';
import * as path from 'path';
import {XLIFF} from './XLIFF';
import {loadXml, writeXml} from './file';
import {Logger, RunOptions, TranslationMapEntry} from './options';

export interface MergeOptions {
  // collapse whitespace in targets and ignore trailing-dot differences when matching sources
  formatOutput?: boolean;
  // when the base has the same source more than once, use the first translation instead of the last
  firstMatchWins?: boolean;
}

export interface RunResult {
  // files written, one per destination language
  written: string[];
  // untranslated entries, only set in extractOriginalOnly mode
  extracted?: TranslationMapEntry[];
}

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

const clone = <T>(value: T): T => structuredClone(value);

// Key used to match sources: whitespace collapsed and, optionally, one trailing dot dropped
export const normalizeSource = (text: string, disregardDots = false): string => {
  const normalized = collapseWhitespace(text);
  return disregardDots && normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;
};

export const sourceEqual = (a: string, b: string, disregardDots = false): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  return normalizeSource(a, disregardDots) === normalizeSource(b, disregardDots);
};

export const getTransUnits = (root: XLIFF.Root | undefined): XLIFF.TransUnit[] =>
  root?.xliff?.file?.[0]?.body?.[0]?.['trans-unit'] ?? [];

// Text of the first element of a <source>/<target>, whether it is plain or has attributes/children
export const getText = (content: XLIFF.Content | undefined): string | undefined => {
  const first = Array.isArray(content) ? content[0] : undefined;
  if (typeof first === 'string') {
    return first;
  }
  if (first && typeof first._ === 'string') {
    return first._;
  }
  return undefined;
};

const hasTarget = (unit: XLIFF.TransUnit): unit is XLIFF.TransUnit & {target: XLIFF.Content} =>
  Array.isArray(unit.target) && unit.target.length > 0;

// Collapses whitespace in the target and adds a trailing dot if the source has one
export const formatTarget = (target: XLIFF.Content, source: string): XLIFF.Content => {
  const format = (text: string): string => {
    const formatted = collapseWhitespace(text);
    return source.endsWith('.') && !formatted.endsWith('.') ? formatted + '.' : formatted;
  };
  const [first, ...rest] = target;
  if (typeof first === 'string') {
    return [format(first), ...rest];
  }
  if (first && typeof first._ === 'string') {
    return [{...first, _: format(first._)}, ...rest];
  }
  return target;
};

// Returns a copy of `source` where every target is taken from the matching unit in `base`
// (matched by source text), or is a copy of the source if there is no translation yet
export const mergeTranslations = (source: XLIFF.Root, base?: XLIFF.Root, options: MergeOptions = {}): XLIFF.Root => {
  const formatOutput = options.formatOutput ?? true;
  const translations = new Map<string, {target: XLIFF.Content, translated: boolean}>();
  for (const unit of getTransUnits(base)) {
    const text = getText(unit.source);
    if (text === undefined || !hasTarget(unit)) {
      continue;
    }
    const key = normalizeSource(text, formatOutput);
    const targetText = getText(unit.target);
    const translated = targetText === undefined || !sourceEqual(text, targetText, formatOutput);
    const existing = translations.get(key);
    // an actual translation always beats a target that is just a copy of the source
    if (existing && (existing.translated && !translated ||
      (existing.translated === translated && options.firstMatchWins))) {
      continue;
    }
    translations.set(key, {target: unit.target, translated});
  }

  const result = clone(source);
  for (const unit of getTransUnits(result)) {
    const text = getText(unit.source);
    const translation = text === undefined ? undefined : translations.get(normalizeSource(text, formatOutput))?.target;
    if (text !== undefined && translation) {
      unit.target = formatOutput ? formatTarget(clone(translation), text) : clone(translation);
    } else {
      unit.target = clone(unit.source);
    }
  }
  return result;
};

// Returns a copy of `xliff` with targets overridden by the map entries of the given language
export const applyTranslationMap = (xliff: XLIFF.Root, lang: string, translationMap: TranslationMapEntry[],
                                    formatOutput = true): XLIFF.Root => {
  const translations = new Map<string, string>();
  for (const entry of translationMap) {
    const key = normalizeSource(entry.source, formatOutput);
    if (entry.lang === lang && !translations.has(key)) {
      translations.set(key, entry.target);
    }
  }

  const result = clone(xliff);
  if (translations.size === 0) {
    return result;
  }
  for (const unit of getTransUnits(result)) {
    const text = getText(unit.source);
    const translation = text === undefined ? undefined : translations.get(normalizeSource(text, formatOutput));
    if (text === undefined || translation === undefined) {
      continue;
    }
    unit.target = formatOutput ? formatTarget([translation], text) : [translation];
  }
  return result;
};

// Lists the units whose target is still the same as the source (i.e. not translated yet)
export const extractUntranslated = (xliff: XLIFF.Root, lang: string, formatOutput = true): TranslationMapEntry[] => {
  const entries: TranslationMapEntry[] = [];
  for (const unit of getTransUnits(xliff)) {
    const source = getText(unit.source);
    const target = getText(unit.target);
    if (source !== undefined && target !== undefined && sourceEqual(source, target, formatOutput)) {
      entries.push({source, target, lang});
    }
  }
  return entries;
};

const exists = async (file: string): Promise<boolean> => {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
};

export const run = async (options: RunOptions, log: Logger = console.log): Promise<RunResult> => {
  const source = await loadXml(options.source.file, log);

  // extraction mode: only report untranslated entries, do not touch the destination
  if (options.extractOriginalOnly) {
    return {written: [], extracted: extractUntranslated(source, options.source.lang, options.formatOutput)};
  }

  const {folder, filename, languages} = options.destination;
  await fsp.mkdir(folder, {recursive: true});

  const written: string[] = [];
  for (const lang of languages) {
    const outPath = path.resolve(folder, filename + '.' + lang + '.xlf');
    let base: XLIFF.Root | undefined;
    if (options.method !== 'rewrite' && await exists(outPath)) {
      base = await loadXml(outPath, log);
    }

    log('Merging translations for: ' + lang + (base ? ' (extending previous translation)' : ''));
    let translated = mergeTranslations(source, base, {
      formatOutput: options.formatOutput,
      firstMatchWins: options.method === 'extend'
    });
    if (options.translationMap.some(m => m.lang === lang)) {
      log('Applying translation map for: ' + lang);
      translated = applyTranslationMap(translated, lang, options.translationMap, options.formatOutput);
    }

    await writeXml(translated, outPath, log);
    written.push(outPath);
  }
  return {written};
};
