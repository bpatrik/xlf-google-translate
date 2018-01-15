import * as path from "path";
import {ConfigLoader} from "typeconfig";

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
    method: string = "extend";

    public load() {
        ConfigLoader.loadBackendConfig(this,
            path.join(__dirname, './../../config.json'));

    }
}

export let Config = new ConfigClass();
Config.load();
