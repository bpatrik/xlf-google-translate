// Shape of an XLIFF 1.2 file as parsed by xml2js (default options: every child element is an array)
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace XLIFF {
  // Element with attributes; `_` holds its content
  export interface TextNode {
    '_': string;
    '$'?: Record<string, string>;
    [child: string]: unknown;
  }

  // Content of a <source> or <target> element, kept as raw inner XML (e.g. 'Deleted <x id="PH"/> photos')
  export type Content = (string | TextNode)[];

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

  export interface TransUnit {
    '$'?: {
      id: string,
      datatype?: string,
      [attribute: string]: string | undefined
    };
    'context-group'?: ContextGroup[];
    source: Content;
    target?: Content;
  }

  export interface Root {
    xliff: {
      '$'?: Record<string, string>,
      file: {
        '$'?: Record<string, string>,
        body: {
          'trans-unit'?: TransUnit[]
        }[]
      }[]
    };
  }
}
