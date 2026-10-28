export type Method = 'extend-only' | 'extend' | 'rewrite';

export const METHODS: readonly Method[] = ['extend-only', 'extend', 'rewrite'];

export interface TranslationMapEntry {
  source: string;
  target: string;
  lang: string;
}

export type Logger = (message: string) => void;

export interface RunOptions {
  source: {lang: string, file: string};
  destination: {folder: string, languages: string[], filename: string};
  method: Method;
  formatOutput: boolean;
  extractOriginalOnly: boolean;
  translationMap: TranslationMapEntry[];
}

// Options as they come from config.json / CLI / env, before validation
export interface RawOptions {
  source?: {lang?: string | null, file?: string | null} | null;
  destination?: {folder?: string | null, languages?: string[] | null, filename?: string | null} | null;
  method?: string | null;
  formatOutput?: boolean | null;
  extractOriginalOnly?: boolean | null;
  translationMap?: TranslationMapEntry[] | null;
}

// Validates raw options and fills in defaults; throws listing every problem found
export const resolveOptions = (raw: RawOptions): RunOptions => {
  const errors: string[] = [];
  const required = (value: string | null | undefined, name: string): string => {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(name + ' is not set');
      return '';
    }
    return value;
  };

  const extractOriginalOnly = raw.extractOriginalOnly === true;
  const source = {
    file: required(raw.source?.file, 'source.file'),
    lang: required(raw.source?.lang, 'source.lang')
  };

  // destination is not used when only extracting untranslated entries
  const destination = {folder: '', filename: '', languages: [] as string[]};
  if (!extractOriginalOnly) {
    destination.folder = required(raw.destination?.folder, 'destination.folder');
    destination.filename = required(raw.destination?.filename, 'destination.filename');
    const languages = raw.destination?.languages;
    if (!Array.isArray(languages) || languages.length === 0) {
      errors.push('destination.languages is not set');
    } else {
      destination.languages = languages;
    }
  }

  const method = (raw.method ?? 'extend') as Method;
  if (!METHODS.includes(method)) {
    errors.push('method must be one of: ' + METHODS.join(', ') + ' (got: ' + method + ')');
  }

  const translationMap = raw.translationMap ?? [];
  if (!Array.isArray(translationMap) ||
    translationMap.some(m => !m || typeof m.source !== 'string' || typeof m.target !== 'string' || typeof m.lang !== 'string')) {
    errors.push('translationMap must be a list of {source: string, target: string, lang: string}');
  }

  if (errors.length > 0) {
    throw new Error('Invalid configuration:\n  ' + errors.join('\n  '));
  }

  return {
    source,
    destination,
    method,
    formatOutput: raw.formatOutput ?? true,
    extractOriginalOnly,
    translationMap
  };
};
