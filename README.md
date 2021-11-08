# Deprecated, not supporting translation anymore since v1.0.0-beta.22
# xlf-google-translate
[![Build Status](https://travis-ci.org/bpatrik/xlf-google-translate.svg?branch=master)](https://travis-ci.org/bpatrik/xlf-google-translate)

It translates the Angular 2 i18n output with google translate


## Features
It uses a `*.xlf` file as an input and translates the `source` tags of the xml with google translate and appends them to the xml as `target`.
It can extend existing translations. A good feature if new/additional text appear in the app. 

## Usage
1) Run `npm run build`
2) Edit the `config.js` to match your requirements
3) Run `npm run start` and your files will be created

config example:
```json
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
    "method": "extend",
    //replaces all line breaks, whitespaces with a single space
    "formatOutput": true
}
```


## known bugs:

Can't handle variable in the `source`
