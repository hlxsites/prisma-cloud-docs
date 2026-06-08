/**
 * Contains all the data from book*.yml files.
 * The `Book` interface in worker/src/types is different since we omit as much data as possible.
 */
export interface RawBook {
  // absolute path to directory that contains the book*.yml
  dir: string;

  // path from repo root to the directory
  repoPath: string;

  // without the path
  filename: string;

  // the actual yaml data
  data: RawBookData;
}

interface RawBookData {
  book: {
    kind: 'book';
    title: string;
    author: string;
    version: string;
    ditamap: string;
    dita: string;
    attributes?: Record<string, unknown>;
    [key: string]: any;
  };

  // rest of the keys are arrays of docs in the book sorted by kind
  [key: string]: any | any[];
}
