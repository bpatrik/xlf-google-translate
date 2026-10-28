import {expect} from 'chai';
import {resolveOptions} from '../src/options';


describe('resolveOptions', () => {
  const valid = {
    source: {lang: 'en', file: 'messages.xlf'},
    destination: {folder: 'out', languages: ['hu'], filename: 'messages'}
  };

  it('fills in defaults', () => {
    expect(resolveOptions(valid)).to.deep.eq({
      ...valid,
      method: 'extend',
      formatOutput: true,
      extractOriginalOnly: false,
      translationMap: []
    });
  });

  it('reports every missing option at once', () => {
    expect(() => resolveOptions({source: {lang: null, file: ''}, destination: {languages: []}}))
      .to.throw(Error)
      .that.satisfies((e: Error) => ['source.file', 'source.lang', 'destination.folder', 'destination.filename', 'destination.languages']
        .every(name => e.message.includes(name + ' is not set')));
  });

  it('does not require a destination when only extracting', () => {
    const options = resolveOptions({source: valid.source, extractOriginalOnly: true});
    expect(options.extractOriginalOnly).to.be.true;
    expect(options.destination.languages).to.deep.eq([]);
  });

  it('rejects an unknown method', () => {
    expect(() => resolveOptions({...valid, method: 'translate'})).to.throw('method must be one of');
  });

  it('rejects a malformed translation map', () => {
    expect(() => resolveOptions({...valid, translationMap: [{source: 'a', target: 'b'}] as never}))
      .to.throw('translationMap must be');
  });
});
