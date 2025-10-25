import * as fs from 'fs';
import * as path from 'path';
import {Config} from './config/Config';
import {XLIFF} from './XLIFF';
import {loadXml, writeXml} from './file';

type TargetType = [string | { _: string, text: string }] | string;

export const sourceEqual = (a: string, b: string, disregardDots = false): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (disregardDots) {
    if (a.endsWith('.') && !b.endsWith('.')) {
      a = a + '.';
    } else if (!a.endsWith('.') && b.endsWith('.')) {
      b = b + '.';
    }
  }
  const trim = (obj: string) => {
    return obj.replace(new RegExp('\\s+', 'g'), ' ').trim();
  };
  return trim(a) === trim(b);
};

const trimTarget = (target: TargetType, source: string): TargetType => {
  const hasDot = typeof source === 'string' && source.endsWith('.');
  if (Array.isArray(target) && target[0] && typeof target[0] === 'string') {
    target[0] = target[0].replace(new RegExp('\\s+', 'g'), ' ').trim();
    if (hasDot && !target[0].endsWith('.')) {
      target[0] += '.';
    }
  } else if (Array.isArray(target) && typeof target[0] === 'object' && typeof target[0]._ === 'string') {
    target[0]._ = target[0]._.replace(new RegExp('\\s+', 'g'), ' ').trim();
    if (hasDot && !target[0]._.endsWith('.')) {
      target[0]._ += '.';
    }
  }
  return target;
};

export const mergerTranslationJson = async (source: XLIFF.Root, base: XLIFF.Root): Promise<XLIFF.Root> => {

  console.log('merging translations');
  const units: { target: TargetType, source: TargetType }[] = source.xliff.file[0].body[0]['trans-unit'] as unknown as {
    target: TargetType,
    source: TargetType
  }[];
  let baseUnits: { target: TargetType, source: TargetType }[] = null;
  if (base && base.xliff && base.xliff.file[0]) {
    baseUnits = base.xliff.file[0].body[0]['trans-unit'] as { target: TargetType, source: TargetType }[];
    console.log('extending previous translation');
  }


  for (let i = 0; i < units.length; i++) {
    units[i].target = units[i].source;
    if (baseUnits != null) {
      for (let j = 0; j < baseUnits.length; j++) {
        if (sourceEqual(baseUnits[j].source[0] as string, units[i].source[0] as string, Config.formatOutput)
          && baseUnits[j].target && baseUnits[j].target.length > 0) {

          units[i].target = baseUnits[j].target;
          if (Config.formatOutput === true) {
            units[i].target = trimTarget(units[i].target, units[i].source[0] as string) as string;
          }
        }
      }
    }

  }

  return source;
};

/**
 * @deprecated since version 1.0.0-beta.22
 */

export const translateJson = async (source: XLIFF.Root, lang: string, base?: XLIFF.Root): Promise<XLIFF.Root> => {

  console.log('translating from: ' + Config.source.lang + ', to: ' + lang + '..');
  const units: { target: TargetType, source: TargetType }[] = source.xliff.file[0].body[0]['trans-unit'] as unknown as {
    target: TargetType,
    source: TargetType
  }[];
  let baseUnits: { target: TargetType, source: TargetType }[] = null;
  if (base && base.xliff && base.xliff.file[0]) {
    baseUnits = base.xliff.file[0].body[0]['trans-unit'] as unknown as { target: TargetType, source: TargetType }[];
    console.log('extending previous translation');
  }

  let skipped = 0;
  let errored = 0;
  outer:
    for (let i = 0; i < units.length; i++) {
      if (baseUnits != null) {
        for (let j = 0; j < baseUnits.length; j++) {
          if (sourceEqual(baseUnits[j].source[0] as string, units[i].source[0] as string, Config.formatOutput)
            && baseUnits[j].target && baseUnits[j].target.length > 0) {


            units[i].target = baseUnits[j].target;
            if (Config.formatOutput === true) {
              units[i].target = trimTarget(units[i].target, units[i].source[0] as string);
            }
            skipped++;
            continue outer;
          }
        }
      }
      if (skipped > 0) {
        console.log('skipped ' + skipped + ' translation(s), because already exist');
        skipped = 0;
      }
      console.log(i + '/' + units.length, units[i].source[0]);
      try {
        const result = units[i].source[0] as { text: string };
        if (result.text !== '') {
          units[i].target = [result.text];
        } else {
          units[i].target = units[i].source;
        }
      } catch (ex) {
        errored++;
        console.warn('Warning: translating error', ex, units[i]);
        units[i].target = units[i].source;
      }
    }

  if (skipped > 0) {
    console.log('skipped ' + skipped + ' translation(s), because already exist');
  }
  if (errored > 0) {
    console.log('Warning: could not translate ' + errored + ' text, original text used instead');
  }
  return source;
};


export const copySourceToTarget = (xliff: XLIFF.Root) => {
  const units: { target: unknown, source: unknown }[] = xliff.xliff.file[0].body[0]['trans-unit'] as unknown as {
    target: unknown,
    source: unknown
  }[];
  for (let i = 0; i < units.length; i++) {
    units[i].target = units[i].source;
  }
  return xliff;
};


export const run = async () => {

  try {
    const source = await loadXml(Config.source.file);

    // Extraction mode: output entries where source == target and do not touch destination
    if (Config.extractOriginalOnly) {
      const units: { target?: TargetType, source: TargetType }[] = source.xliff.file[0].body[0]['trans-unit'] as unknown as {
        target?: TargetType,
        source: TargetType
      }[];
      const results: { source: string, target: string, lang: string }[] = [];
      for (let i = 0; i < units.length; i++) {
        const s = units[i].source && (units[i].source[0] as string);
        const t = units[i].target && (units[i].target[0] as string);
        if (typeof s === 'string' && typeof t === 'string' && sourceEqual(s, t, Config.formatOutput)) {
          results.push({ source: s, target: t, lang: Config.source.lang });
        }
      }
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (!fs.existsSync(Config.destination.folder)) {
      fs.mkdirSync(Config.destination.folder);
    }

    for (let i = 0; i < Config.destination.languages.length; i++) {
      const lang = Config.destination.languages[i];
      const outPath = path.resolve(Config.destination.folder, Config.destination.filename + '.' + lang + '.xlf');
      let base;
      if (fs.existsSync(outPath) === true && (Config.method === 'extend' || Config.method === 'extend-only')) {
        base = await loadXml(outPath);
      }

      let translated = source;
      if (Config.method === 'extend-only') {
        translated = await mergerTranslationJson(source, base);
      } else {
        translated = await translateJson(source, lang, base);
      }

      // Apply translationMap overrides if provided
      if (Array.isArray(Config.translationMap) && Config.translationMap.length > 0) {
        applyTranslationMap(translated, lang);
      }

      await writeXml(translated, outPath);

    }
  } catch (ex) {
    console.error(ex);
  }
};

// Apply translations based on Config.translationMap for a specific language
const applyTranslationMap = (xliff: XLIFF.Root, lang: string) => {
  try {
    const units: { target?: TargetType, source: TargetType }[] = xliff.xliff.file[0].body[0]['trans-unit'] as unknown as {
      target?: TargetType,
      source: TargetType
    }[];
    const maps = (Config.translationMap || []).filter(m => m && m.lang === lang);
    if (maps.length === 0) {
      return;
    }
    for (let i = 0; i < units.length; i++) {
      const src = units[i].source && (units[i].source[0] as string);
      if (typeof src !== 'string') continue;
      const map = maps.find(m => sourceEqual(m.source, src, Config.formatOutput));
      if (!map) continue;
      // Set target from map
      units[i].target = [map.target];
      if (Config.formatOutput) {
        units[i].target = trimTarget(units[i].target, src) as string;
      }
    }
  } catch (e) {
    console.warn('applyTranslationMap warning:', e);
  }
};

