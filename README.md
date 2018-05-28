# xlf-google-translate
[![Build Status](https://travis-ci.org/bpatrik/xlf-google-translate.svg?branch=master)](https://travis-ci.org/bpatrik/xlf-google-translate)

It translates the Angular 2 i18n output with google translate


## Features
It uses a `*.xlf` file as an input and translates the `source` tags of the xml with google translate and appends them to the xml as `target`.
It can extend existing translations. A good feature if new/additional text appear in the app. 

## Usage
1) run the app once, it creates the `config.json`
2) edit the config file and rerun

config example:
```josn
{
    //source data and it language
    "source": { 
        "lang": "en",
        "file": ".../messages.xlf"
    },
    //desitnation folder and the laguages to translate
    "destination": {
        "folder": ".../src/locale",
        "languages": ["hu","de"],
        "filename": "messages"
    },
    //if extend, it does not override the already trasnlated parts
    "method": "extend"
}
```


## known bugs:

Can't handle variable in the `source`
