import {expect} from 'chai';
import {
  applyTranslationMap,
  extractUntranslated,
  formatTarget,
  getText,
  getTransUnits,
  mergeTranslations,
  normalizeSource,
  sourceEqual
} from '../src/translator';
import {XLIFF} from '../src/XLIFF';
import {targets, xliff} from './helpers';


describe('translator', () => {

  describe('sourceEqual', () => {
    it('ignores whitespace differences', () => {
      expect(sourceEqual('', '')).to.be.true;
      expect(sourceEqual('\r\n', ' ')).to.be.true;
      expect(sourceEqual('a\ra\na', ' a a a')).to.be.true;
      expect(sourceEqual('ab\r\n', 'ab ')).to.be.true;
      expect(sourceEqual('ab\r\n', ' ab')).to.be.true;
      expect(sourceEqual('a     b', ' a b')).to.be.true;

      expect(sourceEqual('a\na', 'aa')).to.be.false;
      expect(sourceEqual('a a ', 'aa')).to.be.false;
    });

    it('ignores a single trailing dot only when asked', () => {
      expect(sourceEqual('apple.', 'apple')).to.be.false;
      expect(sourceEqual('apple.', 'apple', true)).to.be.true;
      expect(sourceEqual('apple', 'apple.', true)).to.be.true;
      expect(sourceEqual('apple..', 'apple', true)).to.be.false;
    });

    it('returns false for non-strings', () => {
      expect(sourceEqual(undefined as unknown as string, '')).to.be.false;
      expect(sourceEqual('', null as unknown as string)).to.be.false;
    });
  });

  it('normalizeSource', () => {
    expect(normalizeSource('  a \n b. ')).to.eq('a b.');
    expect(normalizeSource('  a \n b. ', true)).to.eq('a b');
  });

  it('getText reads plain and attributed content', () => {
    expect(getText(['apple'])).to.eq('apple');
    expect(getText([{_: 'apple', $: {lang: 'en'}}])).to.eq('apple');
    expect(getText([])).to.be.undefined;
    expect(getText(undefined)).to.be.undefined;
  });

  it('getTransUnits handles files without units', () => {
    expect(getTransUnits(undefined)).to.deep.eq([]);
    expect(getTransUnits({xliff: {file: [{body: [{}]}]}})).to.deep.eq([]);
    expect(getTransUnits(xliff(['a']))).to.have.length(1);
  });

  describe('formatTarget', () => {
    it('collapses whitespace', () => {
      expect(formatTarget([' Out\ntest '], 'test')).to.deep.eq(['Out test']);
    });

    it('adds a trailing dot if the source has one', () => {
      expect(formatTarget(['alma'], 'apple.')).to.deep.eq(['alma.']);
      expect(formatTarget(['alma.'], 'apple.')).to.deep.eq(['alma.']);
      expect(formatTarget(['alma'], 'apple')).to.deep.eq(['alma']);
    });

    it('formats attributed content without mutating the input', () => {
      const target: XLIFF.Content = [{_: ' al\nma ', $: {state: 'final'}}];
      expect(formatTarget(target, 'apple.')).to.deep.eq([{_: 'al ma.', $: {state: 'final'}}]);
      expect(target).to.deep.eq([{_: ' al\nma ', $: {state: 'final'}}]);
    });
  });

  describe('mergeTranslations', () => {
    it('copies existing translations and falls back to the source', () => {
      const source = xliff(['apple', ''], ['pear']);
      const base = xliff(['apple', 'alma']);
      expect(targets(mergeTranslations(source, base))).to.deep.eq([['alma'], ['pear']]);
    });

    it('copies the source when there is no base', () => {
      expect(targets(mergeTranslations(xliff(['apple', 'stale'])))).to.deep.eq([['apple']]);
    });

    it('does not mutate its inputs or alias their arrays', () => {
      const source = xliff(['apple'], ['pear']);
      const base = xliff(['apple', ' alma ']);
      const sourceCopy = structuredClone(source);
      const baseCopy = structuredClone(base);

      const merged = mergeTranslations(source, base);
      const units = getTransUnits(merged);
      expect(units[1].target).to.not.equal(units[1].source);
      (units[1].target as string[])[0] = 'changed';

      expect(source).to.deep.eq(sourceCopy);
      expect(base).to.deep.eq(baseCopy);
    });

    it('formats the output when formatOutput is on', () => {
      const source = xliff(['test']);
      expect(targets(mergeTranslations(source, xliff(['test', 'Outtest'])))).to.deep.eq([['Outtest']]);
      expect(targets(mergeTranslations(source, xliff(['test', 'Out\ntest'])))).to.deep.eq([['Out test']]);
      expect(targets(mergeTranslations(source, xliff(['test', ' Out\ntest '])))).to.deep.eq([['Out test']]);
    });

    it('keeps the target as is when formatOutput is off', () => {
      const source = xliff(['test']);
      const base = xliff(['test', 'Out\ntest']);
      expect(targets(mergeTranslations(source, base, {formatOutput: false}))).to.deep.eq([['Out\ntest']]);
    });

    it('matches sources ignoring whitespace and, with formatOutput, trailing dots', () => {
      const source = xliff(['Save\n  the   file.']);
      const base = xliff(['Save the file', 'Fájl mentése']);
      expect(targets(mergeTranslations(source, base))).to.deep.eq([['Fájl mentése.']]);
      expect(targets(mergeTranslations(source, base, {formatOutput: false}))).to.deep.eq([['Save\n  the   file.']]);
    });

    it('ignores base units without a target', () => {
      const base = xliff(['apple', 'alma'], ['apple']);
      expect(targets(mergeTranslations(xliff(['apple']), base))).to.deep.eq([['alma']]);
    });

    it('uses the last duplicate by default and the first with firstMatchWins', () => {
      const base = xliff(['apple', 'alma'], ['apple', 'almácska']);
      expect(targets(mergeTranslations(xliff(['apple']), base))).to.deep.eq([['almácska']]);
      expect(targets(mergeTranslations(xliff(['apple']), base, {firstMatchWins: true}))).to.deep.eq([['alma']]);
    });

    it('prefers an actual translation over an untranslated duplicate', () => {
      const base = xliff(['Passwords do not match', 'A két jelszó nem egyezik meg'], ['Passwords do not match.', 'Passwords do not match.']);
      const expected = [['A két jelszó nem egyezik meg.']];
      expect(targets(mergeTranslations(xliff(['Passwords do not match.']), base))).to.deep.eq(expected);
      expect(targets(mergeTranslations(xliff(['Passwords do not match.']), base, {firstMatchWins: true}))).to.deep.eq(expected);
    });

    it('handles attributed sources and targets', () => {
      const source = xliff([[{_: 'apple', $: {}}]]);
      const base = xliff([[{_: 'apple'}], [{_: 'alma', $: {state: 'final'}}]]);
      expect(targets(mergeTranslations(source, base))).to.deep.eq([[{_: 'alma', $: {state: 'final'}}]]);
    });
  });

  describe('applyTranslationMap', () => {
    const map = [
      {source: 'pear', target: 'körte', lang: 'hu'},
      {source: 'pear', target: 'Birne', lang: 'de'},
      {source: 'plum.', target: ' szilva ', lang: 'hu'}
    ];

    it('overrides targets of the given language only', () => {
      const merged = xliff(['apple', 'alma'], ['pear', 'pear'], ['plum', 'plum']);
      expect(targets(applyTranslationMap(merged, 'hu', map))).to.deep.eq([['alma'], ['körte'], ['szilva']]);
      expect(targets(applyTranslationMap(merged, 'de', map))).to.deep.eq([['alma'], ['Birne'], ['plum']]);
      expect(targets(applyTranslationMap(merged, 'fr', map))).to.deep.eq([['alma'], ['pear'], ['plum']]);
      // input untouched
      expect(targets(merged)).to.deep.eq([['alma'], ['pear'], ['plum']]);
    });

    it('matches exactly (apart from whitespace) when formatOutput is off', () => {
      const merged = xliff(['plum', 'plum']);
      expect(targets(applyTranslationMap(merged, 'hu', map, false))).to.deep.eq([['plum']]);
    });

    it('uses the first matching entry', () => {
      const merged = xliff(['pear', 'pear']);
      const duplicates = [{source: 'pear', target: 'körte', lang: 'hu'}, {source: 'pear', target: 'x', lang: 'hu'}];
      expect(targets(applyTranslationMap(merged, 'hu', duplicates))).to.deep.eq([['körte']]);
    });
  });

  it('extractUntranslated lists units whose target equals the source', () => {
    const translated = xliff(['apple', 'alma'], ['pear', 'pear'], ['plum.', 'plum'], ['no target']);
    expect(extractUntranslated(translated, 'en')).to.deep.eq([
      {source: 'pear', target: 'pear', lang: 'en'},
      {source: 'plum.', target: 'plum', lang: 'en'}
    ]);
    expect(extractUntranslated(translated, 'en', false)).to.deep.eq([
      {source: 'pear', target: 'pear', lang: 'en'}
    ]);
  });

});
