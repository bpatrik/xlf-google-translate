import {expect} from 'chai';
import {promises as fsp} from 'fs';
import * as path from 'path';
import {loadXml, toXml} from '../src/file';
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
import {silent, targets, xliff} from './helpers';


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

    it('keeps a single leading or trailing space where the source has one', () => {
      expect(formatTarget(['Másolás'], 'Copy ')).to.deep.eq(['Másolás ']);
      expect(formatTarget(['  Statisztika: \n'], ' Statistic: ')).to.deep.eq([' Statisztika: ']);
      expect(formatTarget([' Menü'], '\n  Menu')).to.deep.eq([' Menü']);
      expect(formatTarget([' alma '], 'apple')).to.deep.eq(['alma']);
      expect(formatTarget([' '], ' ')).to.deep.eq(['']);
    });

    it('checks the trailing dot ignoring spaces at the end of the source', () => {
      expect(formatTarget(['Időkorlát'], 'Timeout. ')).to.deep.eq(['Időkorlát. ']);
      expect(formatTarget(['<x id="PH"/> törölve'], ' Deleted <x id="PH"/>. ')).to.deep.eq([' <x id="PH"/> törölve. ']);
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

    it('gives the same result when merging its own output again', () => {
      const source = xliff([' Statistic: '], ['Copy '], ['Save']);
      const base = xliff(['Statistic:', 'Statisztika:'], ['Save ', ' Mentés ']);
      const once = mergeTranslations(source, base);
      expect(targets(once)).to.deep.eq([[' Statisztika: '], ['Copy '], ['Mentés']]);
      expect(targets(mergeTranslations(source, once))).to.deep.eq(targets(once));
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

  describe('placeholders', () => {
    const asset = (name: string): string => path.join(__dirname, 'assets', name);
    let source: XLIFF.Root;
    let existing: XLIFF.Root;
    // unit id -> written <target> line
    let written: Map<string, string>;

    before(async () => {
      source = await loadXml(asset('placeholders.source.xlf'), silent);
      existing = await loadXml(asset('placeholders.hu.xlf'), silent);
      const xml = toXml(mergeTranslations(source, existing));
      written = new Map([...xml.matchAll(/<trans-unit id="([^"]+)"[\s\S]*?(<target>[\s\S]*?<\/target>)/g)]
        .map(m => [m[1], m[2]]));
    });

    it('keeps <source>/<target> content as inner XML', () => {
      expect(getText(getTransUnits(existing)[0].source))
        .to.eq('Deleted <x id="PH" equiv-text="n"/> photos from <x id="PH_1" equiv-text="dir"/>.');
    });

    it('matches placeholders by id, ignoring other attributes and whitespace', () => {
      expect(sourceEqual('Deleted <x id="PH" equiv-text="n"/> photos', 'Deleted  <x  id="PH"/>\n photos')).to.be.true;
      expect(sourceEqual('Deleted <x id="PH"/> photos', 'Deleted <x id="PH_1"/> photos')).to.be.false;
      expect(sourceEqual('Deleted <x id="PH"/> photos', 'Deleted photos')).to.be.false;
      expect(sourceEqual('Deleted <x id="PH"/>.', 'Deleted <x id="PH"/>', true)).to.be.true;
    });

    it('keeps the translation of a placeholder unit', () => {
      expect(written.get('deleted'))
        .to.eq('<target><x id="PH" equiv-text="n"/> fotó törölve innen: <x id="PH_1" equiv-text="dir"/>.</target>');
      expect(written.get('debug')).to.eq('<target>Állítsd a <x id="START_TAG_CODE" ctype="x-code" equiv-text="&lt;code&gt;"/>' +
        'NODE_ENV<x id="CLOSE_TAG_CODE" ctype="x-code" equiv-text="&lt;/code&gt;"/> értékét debug-ra.</target>');
    });

    it('keeps placeholder order of the target, also when it differs from the source', () => {
      expect(written.get('moved')).to.eq('<target>A(z) <x id="PH_1"/> mappába áthelyezve: <x id="PH"/></target>');
    });

    it('does not reuse the translation of a changed text or placeholder id', () => {
      expect(written.get('shared')).to.eq('<target>Shared <x id="PH"/> videos</target>');
      expect(written.get('open')).to.eq('<target>Open <x id="PH_1"/></target>');
    });

    it('round-trips non-ASCII text and entities', () => {
      expect(written.get('accents')).to.eq('<target>Árvíztűrő tükörfúrógép, ő és ű</target>');
      // &#60; in the source is written the same way xml2js always wrote it
      expect(written.get('entities')).to.eq('<target>Tom &amp; Jerry &lt;3 "mindig"</target>');
    });

    it('writes loaded files back unchanged', async () => {
      for (const name of ['placeholders.hu.xlf', 'messages.hu.xlf']) {
        const content = await fsp.readFile(asset(name), 'utf-8');
        expect(toXml(await loadXml(asset(name), silent))).to.eq(content.trimEnd(), name);
      }
    });

    it('formats placeholder targets without touching the placeholders', () => {
      expect(formatTarget([' <x id="PH" equiv-text="a  b"/>\n fotó  '], 'Deleted <x id="PH"/>.'))
        .to.deep.eq(['<x id="PH" equiv-text="a  b"/> fotó.']);
    });

    it('applies translation map entries with placeholders', () => {
      const map = [{source: 'Open <x id="PH_1"/>', target: '<x id="PH_1"/> megnyitása & mentése', lang: 'hu'}];
      const unit = getTransUnits(applyTranslationMap(mergeTranslations(source, existing), 'hu', map))[3];
      expect(unit.target).to.deep.eq(['<x id="PH_1"/> megnyitása &amp; mentése']);
    });
  });

});
