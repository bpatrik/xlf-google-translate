import {promises as fsp} from 'fs';
import * as xml2js from 'xml2js';
import {XLIFF} from './XLIFF';

export const loadXml = async (file: string): Promise<XLIFF.Root> => {
  console.log('Reading: ' + file);
  const data: string = await fsp.readFile(file, 'utf-8');
  return await xml2js.parseStringPromise(data);
};


export const writeXml = async (json: XLIFF.Root, pathStr: string): Promise<void> => {
  const builder = new xml2js.Builder();
  const xml = builder.buildObject(json);
  await fsp.writeFile(pathStr, xml);
  console.log('successfully written our update xml to file');
};

