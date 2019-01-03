import * as fs from 'fs';
import * as path from 'path';
import * as translate from '@k3rn31p4nic/google-translate-api';
import {Config} from './config/Config';
import {XLIFF} from './XLIFF';
import {loadXml, writeXml} from './file';


if (Config.source.file == null) {
  console.log('source.file is not set');
  process.exit();
}
if (Config.source.lang == null) {
  console.log('source.lang is not set');
  process.exit();
}
if (Config.destination.languages == null) {
  console.log('destination.languages is not set');
  process.exit();
}

if (Config.destination.folder == null) {
  console.log('destination.folder is not set');
  process.exit();
}

export const sourceEqual = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const trim = (obj) => {
    return obj.replace(new RegExp('\\s+', 'g'), ' ').trim();
  };
  return trim(a) === trim(b);
};

export const translateJson = async (source: XLIFF, lang: string, base?: XLIFF): Promise<XLIFF> => {

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

            const copy = baseUnits[j].target;
            if (copy[0] && Config.formatOutput === true) {
              copy[0] = copy[0].replace(new RegExp('\\s+', 'g'), ' ').trim();
            }
            units[i].target = copy;
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


export const copySourceToTarget = (xliff: XLIFF) => {
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
      if (fs.existsSync(outPath) === true && Config.method === 'extend') {
        base = await loadXml(outPath);
      }

      const translated = await translateJson(source, Config.destination.languages[i], base);
      await writeXml(translated, outPath);

    }
  } catch (ex) {
    console.error(ex);
  }
};

