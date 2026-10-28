import {XLIFF} from '../src/XLIFF';

// Builds a minimal XLIFF root from [source, target?] pairs
export const xliff = (...units: [XLIFF.Content | string, (XLIFF.Content | string)?][]): XLIFF.Root => ({
  xliff: {
    file: [{
      body: [{
        'trans-unit': units.map(([source, target], i) => {
          const unit: XLIFF.TransUnit = {
            $: {id: 'id' + i, datatype: 'html'},
            source: typeof source === 'string' ? [source] : source
          };
          if (target !== undefined) {
            unit.target = typeof target === 'string' ? [target] : target;
          }
          return unit;
        })
      }]
    }]
  }
});

export const targets = (root: XLIFF.Root): XLIFF.Content[] =>
  (root.xliff.file[0].body[0]['trans-unit'] ?? []).map(u => u.target ?? []);

export const silent = (): void => undefined;
