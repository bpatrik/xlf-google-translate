import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import * as translate from '@k3rn31p4nic/google-translate-api';
import {Config} from './config/Config';
import {XLIFF} from './XLIFF';
import {loadXml, writeXml} from './file';



export const sourceEqual = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const trim = (obj: string) => {
    return obj.replace(new RegExp('\\s+', 'g'), ' ').trim();
  };
  return trim(a) === trim(b);
};

const trimTarget = (target: any): any => {
  if (target[0] && typeof target[0] === 'string') {
    target[0] = target[0].replace(new RegExp('\\s+', 'g'), ' ').trim();
  } else if (typeof target[0] === 'object' && typeof target[0]._ === 'string') {
    target[0]._ = target[0]._.replace(new RegExp('\\s+', 'g'), ' ').trim();
  }
  return target;
};

export const mergerTranslationJson = async (source: XLIFF.Root, base: XLIFF.Root): Promise<XLIFF.Root> => {

  console.log('merging translations');
  const units: any[] = source.xliff.file[0].body[0]['trans-unit'];
  let baseUnits: any[] = null;
  if (base && base.xliff && base.xliff.file[0]) {
    baseUnits = base.xliff.file[0].body[0]['trans-unit'];
    console.log('extending previous translation');
  }

  for (let i = 0; i < units.length; i++) {
    units[i].target = units[i].source;
    if (baseUnits != null) {
      for (let j = 0; j < baseUnits.length; j++) {
        if (sourceEqual(baseUnits[j].source[0], units[i].source[0])
          && baseUnits[j].target && baseUnits[j].target.length > 0) {

          units[i].target = baseUnits[j].target;
          if (Config.formatOutput === true) {
            units[i].target = trimTarget(units[i].target);
          }
        }
      }
    }

  }

  return source;
};

export const translateJson = async (source: XLIFF.Root, lang: string, base?: XLIFF.Root): Promise<XLIFF.Root> => {

  console.log('translating from: ' + Config.source.lang + ', to: ' + lang + '..');
  const units: any[] = source.xliff.file[0].body[0]['trans-unit'];
  let baseUnits: any[] = null;
  if (base && base.xliff && base.xliff.file[0]) {
    baseUnits = base.xliff.file[0].body[0]['trans-unit'];
    console.log('extending previous translation');
  }

  let skipped = 0;
  let errored = 0;
  outer:
    for (let i = 0; i < units.length; i++) {
      if (baseUnits != null) {
        for (let j = 0; j < baseUnits.length; j++) {
          if (sourceEqual(baseUnits[j].source[0], units[i].source[0])
            && baseUnits[j].target && baseUnits[j].target.length > 0) {


            units[i].target = baseUnits[j].target;
            if (Config.formatOutput === true) {
              units[i].target = trimTarget(units[i].target);
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
        const result = await translate(units[i].source[0], {from: Config.source.lang, to: lang});
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
  const units: any[] = xliff.xliff.file[0].body[0]['trans-unit'];
  for (let i = 0; i < units.length; i++) {
    units[i].target = units[i].source;
  }
  return xliff;
};


export const run = async () => {

  try {
    if (!fs.existsSync(Config.destination.folder)) {
      fs.mkdirSync(Config.destination.folder);
    }
    const source = await loadXml(Config.source.file);
    for (let i = 0; i < Config.destination.languages.length; i++) {
      const outPath = path.resolve(Config.destination.folder, Config.destination.filename + '.' + Config.destination.languages[i] + '.xlf');
      let base;
      if (fs.existsSync(outPath) === true && (Config.method === 'extend' || Config.method === 'extend-only')) {
        base = await loadXml(outPath);
      }

      let translated = source;
      if (Config.method === 'extend-only') {
        translated = await mergerTranslationJson(source, base);
      } else {
        translated = await translateJson(source, Config.destination.languages[i], base);
      }
      await writeXml(translated, outPath);

    }
  } catch (ex) {
    console.error(ex);
  }
};

