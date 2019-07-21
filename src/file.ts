import * as fs from 'fs';
import * as xml2js from 'xml2js';
import {XLIFF} from './XLIFF';

export const loadXml = async (file: string): Promise<XLIFF> => {
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

export const writeXml = (json: XLIFF, pathStr: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {

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

