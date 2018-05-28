export interface XLIFF {
  xliff: {
    file: {
      body: {
        'trans-unit': {
          source: string[],
          target: string[]
        }[]
      }[]
    }[]
  };
}
