import 'reflect-metadata';
import * as path from 'path';
import {ConfigClass, ConfigClassBuilder} from 'typeconfig/node';
import {ConfigProperty} from 'typeconfig/common';

/**
 * This configuration will be only at backend
 */
@ConfigClass({
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
  source: { lang: string, file: string } = {
    lang: null,
    file: null
  };

  @ConfigProperty()
  destination: { folder: string, filename: string, languages: string[] } = {
    folder: null,
    languages: [],
    filename: null
  };

  @ConfigProperty({type: 'string'})
  method: 'extend-only' | 'extend' | 'rewrite' = 'extend';

  @ConfigProperty({type: 'boolean'})
  formatOutput = true;


}


export const Config = ConfigClassBuilder.attachInterface(new ConfigBuilder());
Config.loadSync();
