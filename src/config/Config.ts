import * as path from 'path';
import {ConfigLoader} from 'typeconfig';

/**
 * This configuration will be only at backend
 */
export class ConfigClass {

  source: { lang: string, file: string } = {
    lang: null,
    file: null
  };
  destination: { folder: string, filename: string, languages: string[] } = {
    folder: null,
    languages: [],
    filename: null
  };
  method: 'extend-only' | 'extend' | 'rewrite' = 'extend';
  formatOutput = true;

  public load() {
    ConfigLoader.loadBackendConfig(this,
      path.join(__dirname, './../../config.json'));
    if (typeof this.destination.languages === 'string') {
      try {
        this.destination.languages = JSON.parse(this.destination.languages);
      } catch (e) {
        this.destination.languages = [<any>this.destination.languages];
      }
    }

  }
}

export let Config = new ConfigClass();
Config.load();
