/* tslint:disable:no-inferrable-types */
import 'reflect-metadata';
import * as path from 'path';
import {ConfigClass, ConfigClassBuilder} from 'typeconfig/node';
import {SubConfigClass} from 'typeconfig/src/decorators/class/SubConfigClass';
import {ConfigProperty} from 'typeconfig/common';


@SubConfigClass()
export class DestinationConfig {
  @ConfigProperty()
  folder: string = null;
  @ConfigProperty({type: 'array', arrayType: 'string'})
  languages: string[] = [];
  @ConfigProperty()
  filename: string = null;
}

@SubConfigClass()
export class SourceConfig {
  @ConfigProperty()
  lang: string = null;
  @ConfigProperty()
  file: string = null;
}

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
  source: SourceConfig = new SourceConfig();

  @ConfigProperty()
  destination: DestinationConfig = new DestinationConfig();

  @ConfigProperty({type: 'string'})
  method: 'extend-only' | 'extend' | 'rewrite' = 'extend';

  @ConfigProperty()
  formatOutput: boolean = true;


}


export const Config = ConfigClassBuilder.attachInterface(new ConfigBuilder());
Config.loadSync();
