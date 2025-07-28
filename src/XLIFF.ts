// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace XLIFF {
  export interface ContextGroup {
    'context': {
      '_': string,
      '$': {
        'context-type': 'sourcefile' | 'linenumber'
      }
    }[];
    '$': {
      'purpose': 'location'
    };
  }


  export interface Root {
    xliff: {
      file: {
        body: {
          'trans-unit': {
            '$'?: {
              id: string,
              datatype: 'html'
            }
            'context-group'?: ContextGroup[]
            source: string[],
            target?: string[]
          }[]
        }[]
      }[]
    };
  }
}
