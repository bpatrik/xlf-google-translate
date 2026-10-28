import {expect} from 'chai';
import {execFile} from 'child_process';
import {promises as fsp} from 'fs';
import * as os from 'os';
import * as path from 'path';
import {promisify} from 'util';
import {loadXml, writeXml} from '../src/file';
import {resolveOptions, RunOptions} from '../src/options';
import {getText, getTransUnits, run} from '../src/translator';
import {XLIFF} from '../src/XLIFF';
import {silent} from './helpers';

const execFileP = promisify(execFile);
const asset = path.join(__dirname, 'assets', 'messages.hu.xlf');

// source text -> target text
const translations = (root: XLIFF.Root): Map<string, string | undefined> =>
  new Map(getTransUnits(root).map(u => [getText(u.source) as string, getText(u.target)]));


describe('run', function () {
  this.timeout(30000);

  let dir: string;
  let sourceFile: string;
  let destFolder: string;
  let existing: XLIFF.Root;

  beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'xlf-test-'));
    destFolder = path.join(dir, 'translate');
    sourceFile = path.join(dir, 'locale.source.xlf');

    // existing Hungarian translation
    existing = await loadXml(asset, silent);
    await fsp.mkdir(destFolder);
    await fsp.copyFile(asset, path.join(destFolder, 'messages.hu.xlf'));

    // freshly extracted source: no targets, one unit removed, one new unit added
    const source = structuredClone(existing);
    const units = getTransUnits(source);
    units.forEach(u => delete u.target);
    units.splice(1, 1);
    units.push({$: {id: 'new', datatype: 'html'}, source: ['A brand new text']});
    await writeXml(source, sourceFile, silent);
  });

  afterEach(async () => {
    await fsp.rm(dir, {recursive: true, force: true});
  });

  const options = (overrides: Partial<RunOptions> = {}): RunOptions => resolveOptions({
    source: {lang: 'en', file: sourceFile},
    destination: {folder: destFolder, languages: ['hu', 'de'], filename: 'messages'},
    method: 'extend-only',
    ...overrides
  });

  it('extends existing translations and creates missing languages', async () => {
    const result = await run(options(), silent);
    expect(result.written).to.deep.eq([
      path.join(destFolder, 'messages.hu.xlf'),
      path.join(destFolder, 'messages.de.xlf')
    ]);

    const hu = translations(await loadXml(result.written[0], silent));
    const old = translations(existing);
    expect(hu.size).to.eq(old.size); // one removed, one added
    expect(hu.get('Database')).to.be.undefined; // removed from source
    expect(hu.get('Username')).to.eq('Felhasználónév');
    expect(hu.get('Sqlite will save the db with this filename.')).to.eq('Sqlite ezen a néven menti majd el az adatbázist.');
    expect(hu.get('A brand new text')).to.eq('A brand new text');

    // no previous German file: everything falls back to the source
    const de = translations(await loadXml(result.written[1], silent));
    for (const [source, target] of de) {
      expect(target).to.eq(source);
    }
  });

  it('keeps the unit structure (ids, context groups)', async () => {
    const result = await run(options({destination: {folder: destFolder, languages: ['hu'], filename: 'messages'}}), silent);
    const units = getTransUnits(await loadXml(result.written[0], silent));
    const original = getTransUnits(existing)[0];
    expect(units[0].$).to.deep.eq(original.$);
    expect(units[0]['context-group']).to.deep.eq(original['context-group']);
  });

  it('starts from scratch with method rewrite', async () => {
    const result = await run(options({method: 'rewrite'}), silent);
    const hu = translations(await loadXml(result.written[0], silent));
    expect(hu.get('Username')).to.eq('Username');
  });

  it('applies the translation map on top of the merge', async () => {
    const result = await run(options({
      translationMap: [
        {source: 'A brand new text', target: 'Egy vadonatúj szöveg', lang: 'hu'},
        {source: 'Username', target: 'Benutzername', lang: 'de'}
      ]
    }), silent);
    const hu = translations(await loadXml(result.written[0], silent));
    const de = translations(await loadXml(result.written[1], silent));
    expect(hu.get('A brand new text')).to.eq('Egy vadonatúj szöveg');
    expect(hu.get('Username')).to.eq('Felhasználónév');
    expect(de.get('Username')).to.eq('Benutzername');
  });

  it('extracts untranslated entries without writing files', async () => {
    const result = await run(resolveOptions({
      source: {lang: 'hu', file: path.join(destFolder, 'messages.hu.xlf')},
      extractOriginalOnly: true
    }), silent);
    expect(result.written).to.deep.eq([]);
    expect(result.extracted).to.deep.include({source: 'Host', target: 'Host', lang: 'hu'});
    expect(result.extracted?.map(e => e.source)).to.not.include('Username');
  });

  describe('cli', () => {
    const cli = (...args: string[]) => execFileP(process.execPath,
      ['-r', 'ts-node/register', path.join(__dirname, '..', 'src', 'cli.ts'),
        '--config-path=' + path.join(dir, 'config.json'), ...args],
      {env: {...process.env, TS_NODE_TRANSPILE_ONLY: 'true'}});

    it('merges translations with the same switches pigallery2 uses', async () => {
      await cli('--method=extend-only', '--source-lang=en', '--source-file=' + sourceFile,
        '--destination-filename=messages', '--destination-folder=' + destFolder,
        '--destination-languages=["hu","de"]');
      const hu = translations(await loadXml(path.join(destFolder, 'messages.hu.xlf'), silent));
      expect(hu.get('Username')).to.eq('Felhasználónév');
      expect(hu.get('A brand new text')).to.eq('A brand new text');
      await fsp.access(path.join(destFolder, 'messages.de.xlf'));
    });

    it('prints only JSON to stdout when extracting', async () => {
      const {stdout} = await cli('--extractOriginalOnly=true', '--source-lang=hu',
        '--source-file=' + path.join(destFolder, 'messages.hu.xlf'));
      expect(JSON.parse(stdout)).to.deep.include({source: 'Host', target: 'Host', lang: 'hu'});
    });

    it('exits with an error for invalid configuration', async () => {
      try {
        await cli('--source-lang=en');
        expect.fail('should have failed');
      } catch (e) {
        const err = e as {code: number, stderr: string};
        expect(err.code).to.eq(1);
        expect(err.stderr).to.include('source.file is not set');
      }
    });
  });
});
