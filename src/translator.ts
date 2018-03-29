import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import * as translate from 'google-translate-api';
import {Config} from './config/Config';

interface XLIFF {
  xliff: {
    file: {
      body: {
        'trans-unit': {
          source: string[],
          target: string[]
        }[]
      }
    }[]
  };
}


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

const loadXml = async (file): Promise<XLIFF> => {
  return new Promise<XLIFF>((resolve, reject) => {
    fs.readFile(file, 'utf-8', (err, data) => {
      if (err) {
        return reject(err);
      }
      // we log out the readFile results
      //  console.log(data);
      // we then pass the data to our method here
      xml2js.parseString(data, (error, result: XLIFF) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      });
    });
  });
};

const writeXml = async (json: XLIFF, pathStr: string) => {
  return new Promise((resolve, reject) => {

    // create a new builder object and then convert
    // our json back to xml.
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(json);
    fs.writeFile(pathStr, xml, (err) => {
      if (err) {
        console.error(err);
        return reject(err);
      }

      resolve();
      console.log('successfully written our update xml to file');
    });
  });
};

const translateJson = async (source: XLIFF, lang: string, base?: XLIFF) => {

  console.log('translating: ' + lang + '..');
  const units: any[] = source.xliff.file[0].body[0]['trans-unit'];
  let baseUnits: any[] = null;
  if (base && base.xliff && base.xliff.file[0]) {
    baseUnits = base.xliff.file[0].body[0]['trans-unit'];
    console.log('extending previous translation');
  }

  let skipped = 0;
  outer:
    for (let i = 0; i < units.length; i++) {
      if (baseUnits != null) {
        for (let j = 0; j < baseUnits.length; j++) {
          if (JSON.stringify(baseUnits[j].source[0]) === JSON.stringify(units[i].source[0])
            && baseUnits[j].target && baseUnits[j].target.length > 0) {
            units[i].target = baseUnits[j].target;
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
        console.warn('translating error', ex, units[i]);
        units[i].target = units[i].source;
      }
    }

  if (skipped > 0) {
    console.log('skipped ' + skipped + ' translation(s), because already exist');
  }
  return source;
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

