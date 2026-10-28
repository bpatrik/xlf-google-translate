import {promises as fsp} from 'fs';
import * as xml2js from 'xml2js';
import {XLIFF} from './XLIFF';
import {Logger} from './options';

// <source>/<target> contents are kept as raw inner XML strings (e.g. 'Deleted <x id="PH"/> photos'),
// so xml2js never splits inline elements from the text around them

// An inline element such as <x id="PH"/>, <g id="1"> or </g>
export const TAG_REGEX = /<[^<>]+>/g;

const CONTENT_REGEX = /<(source|target)(\s[^<>]*)?(?<!\/)>([\s\S]*?)<\/\1>/g;

const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: '\''};

const decodeText = (text: string): string =>
  text.replace(/&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi, (entity, hex?: string, dec?: string, name?: string) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) :
      dec ? String.fromCodePoint(parseInt(dec, 10)) :
        ENTITIES[name as string] ?? entity);

// Same escaping xml2js's builder uses for text, so plain-text output stays unchanged
const escapeText = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');

// Re-escapes the text between inline elements in one canonical way; elements are kept as is
export const canonicalizeContent = (xml: string): string => {
  let result = '';
  let last = 0;
  for (const match of xml.matchAll(TAG_REGEX)) {
    result += escapeText(decodeText(xml.slice(last, match.index))) + match[0];
    last = match.index + match[0].length;
  }
  return result + escapeText(decodeText(xml.slice(last)));
};

export const parseXml = async (data: string): Promise<XLIFF.Root> => {
  // escaping the inner XML turns it into plain text, which xml2js decodes back to the canonical inner XML
  const escaped = data.replace(CONTENT_REGEX, (_, name: string, attributes: string | undefined, inner: string) =>
    '<' + name + (attributes ?? '') + '>' + escapeText(canonicalizeContent(inner)) + '</' + name + '>');
  return await xml2js.parseStringPromise(escaped);
};

export const loadXml = async (file: string, log: Logger = console.log): Promise<XLIFF.Root> => {
  log('Reading: ' + file);
  return await parseXml(await fsp.readFile(file, 'utf-8'));
};

export const toXml = (json: XLIFF.Root): string => {
  // the builder would escape the inner XML, so it gets a token that is swapped back afterwards
  const raw: string[] = [];
  const tokenize = (content: XLIFF.Content | undefined): void => {
    content?.forEach((item, i) => {
      const text = typeof item === 'string' ? item : item._;
      if (typeof text !== 'string' || text === '') {
        return;
      }
      const token = '' + raw.push(text) + '';
      content[i] = typeof item === 'string' ? token : {...item, _: token};
    });
  };
  const copy = structuredClone(json);
  for (const file of copy.xliff?.file ?? []) {
    for (const body of file.body ?? []) {
      for (const unit of body['trans-unit'] ?? []) {
        tokenize(unit.source);
        tokenize(unit.target);
      }
    }
  }
  return new xml2js.Builder().buildObject(copy).replace(/(\d+)/g, (_, i: string) => raw[Number(i) - 1]);
};

export const writeXml = async (json: XLIFF.Root, file: string, log: Logger = console.log): Promise<void> => {
  await fsp.writeFile(file, toXml(json));
  log('Written: ' + file);
};
