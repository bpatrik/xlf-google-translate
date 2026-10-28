import 'reflect-metadata';
import * as path from 'path';
import {ConfigClass, ConfigClassBuilder} from 'typeconfig/node';
import {ConfigProperty, SubConfigClass} from 'typeconfig/common';
import {Method, TranslationMapEntry} from '../options';


@SubConfigClass()
export class DestinationConfig {
  @ConfigProperty({type: 'string', description: 'Folder of the translated files.'})
  folder: string | null = null;
  @ConfigProperty({type: 'array', arrayType: 'string', description: 'Languages to create translation files for.'})
  languages: string[] = [];
  @ConfigProperty({type: 'string', description: 'Translated files are named <filename>.<lang>.xlf.'})
  filename: string | null = null;
}

@SubConfigClass()
export class SourceConfig {
  @ConfigProperty({type: 'string', description: 'Language of the source file.'})
  lang: string | null = null;
  @ConfigProperty({type: 'string', description: 'Source *.xlf file (e.g. the output of ng extract-i18n).'})
  file: string | null = null;
}

@ConfigClass({
  // dist/config/ -> package root
  configPath: path.join(__dirname, './../../config.json'),
  saveIfNotExist: true,
  attachDescription: true,
  enumsAsString: true,
  softReadonly: true,
  cli: {
    enable: {
      configPath: true,
      attachState: true,
      attachDescription: true,
      rewriteCLIConfig: true,
      rewriteENVConfig: true,
      enumsAsString: true,
      saveIfNotExist: true,
      exitOnConfig: true
    },
    defaults: {
      enabled: true
    }
  }
})
export class ConfigBuilder {

  @ConfigProperty()
  source: SourceConfig = new SourceConfig();

  @ConfigProperty()
  destination: DestinationConfig = new DestinationConfig();

  @ConfigProperty({type: 'string', description: 'extend-only | extend: keep existing translations, rewrite: start from scratch.'})
  method: Method = 'extend';

  @ConfigProperty({type: 'boolean', description: 'Collapse whitespace in targets and ignore trailing dot differences.'})
  formatOutput = true;

  @ConfigProperty({type: 'boolean', description: 'If true, only extract those entries that are not translated yet.'})
  extractOriginalOnly = false;

  @ConfigProperty({type: 'array', arrayType: 'object', description: 'Uses it for translation. Format: {source: "source", target: "target", lang: "string"}'})
  translationMap: TranslationMapEntry[] = [];
}


export const Config = ConfigClassBuilder.attachInterface(new ConfigBuilder());
Config.loadSync();
