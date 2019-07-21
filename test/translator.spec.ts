import {expect} from 'chai';
import {mergerTranslationJson, sourceEqual, translateJson} from '../src/translator';
import {XLIFF} from '../src/XLIFF';
import {Config} from '../src/config/Config';


describe('translator', () => {

  it('sourceEqual', () => {

    expect(sourceEqual('', '')).to.be.true;
    expect(sourceEqual('\r\n', ' ')).to.be.true;
    expect(sourceEqual('a\ra\na', ' a a a')).to.be.true;
    expect(sourceEqual('ab\r\n', 'ab ')).to.be.true;
    expect(sourceEqual('ab\r\n', ' ab')).to.be.true;
    expect(sourceEqual('a     b', ' a b')).to.be.true;


    expect(sourceEqual('a\na', 'aa')).to.be.false;
    expect(sourceEqual('a a ', 'aa')).to.be.false;
  });

  it('translateJson', async () => {
    const sourceSource = [''];
    const sourceBase = [''];
    const targetBase = [''];
    const source: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceSource,
              target: ['']
            }]
          }]
        }]
      }
    };
    const base: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceBase,
              target: targetBase
            }]
          }]
        }]
      }
    };

    Config.formatOutput = true;
    sourceSource[0] = 'test';
    sourceBase[0] = 'test';
    targetBase[0] = 'Outtest';
    expect(targetBase[0]).to.eq((await translateJson(source, 'hu', base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);

    sourceSource[0] = 'test';
    sourceBase[0] = 'test';
    targetBase[0] = 'Out\ntest';
    expect('Out test').to.eq((await translateJson(source, 'hu', base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);

    sourceSource[0] = 'test';
    sourceBase[0] = 'test';
    targetBase[0] = ' Out\ntest ';
    expect('Out test').to.eq((await translateJson(source, 'hu', base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);


    Config.formatOutput = false;
    sourceSource[0] = 'test';
    sourceBase[0] = 'test';
    targetBase[0] = 'Out\ntest';
    expect('Out\ntest').to.eq((await translateJson(source, 'hu', base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);
  });


  it('translate to hu', async () => {
    const sourceSource = [''];
    const sourceBase = [''];
    const targetBase = [''];
    const source: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceSource,
              target: ['']
            }]
          }]
        }]
      }
    };
    const base: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceBase,
              target: targetBase
            }]
          }]
        }]
      }
    };

    sourceSource[0] = 'apple';
    sourceBase[0] = '';
    targetBase[0] = 'alma';
    expect(targetBase[0]).to.eq((await translateJson(source, 'hu', base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);
  });


  it('merge translations ', async () => {
    const sourceSource = [''];
    const sourceBase = [''];
    const targetBase = [''];
    const source: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceSource,
              target: ['']
            }, {
              source: ['pear'],
              target: ['pear']
            }]
          }]
        }]
      }
    };
    const base: XLIFF = {
      xliff: {
        file: [{
          body: [{
            'trans-unit': [{
              source: sourceBase,
              target: targetBase
            }]
          }]
        }]
      }
    };

    sourceSource[0] = 'apple';
    sourceBase[0] = 'apple';
    targetBase[0] = 'alma';
    expect(targetBase[0]).to.eq((await mergerTranslationJson(source, base))
      .xliff.file[0].body[0]['trans-unit'][0].target[0]);

    expect(source.xliff.file[0].body[0]['trans-unit'][1].target[0])
      .to.eq((await mergerTranslationJson(source, base))
      .xliff.file[0].body[0]['trans-unit'][1].target[0]);
  });


});
