import {promises as fsp} from 'fs';
import * as xml2js from 'xml2js';
import {XLIFF} from './XLIFF';
import {Logger} from './options';

export const loadXml = async (file: string, log: Logger = console.log): Promise<XLIFF.Root> => {
  log('Reading: ' + file);
  const data = await fsp.readFile(file, 'utf-8');
  return await xml2js.parseStringPromise(data);
};

export const toXml = (json: XLIFF.Root): string => new xml2js.Builder().buildObject(json);

export const writeXml = async (json: XLIFF.Root, file: string, log: Logger = console.log): Promise<void> => {
  await fsp.writeFile(file, toXml(json));
  log('Written: ' + file);
};
