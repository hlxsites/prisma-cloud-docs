// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOk = any;

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'DELETE';

export interface Environment {
  NODE_ENV: 'development' | undefined;
  CONTENT_UPSTREAM: string;
  DOC_UPSTREAM: string;
  DOC_REPO_OWNER: string;
  DOC_REPO_NAME: string;
  DOC_REPO_REF: string;
  DOC_REPO_ROOT_PATH?: string;
  BASE_PATH?: string;
  PREVIEW_UPSTREAM: string;
  PREVIEW_REPO_OWNER: string;
  PREVIEW_REPO_NAME: string;
  // Missing in development env
  GITHUB_PAT?: string;
  [key: string]: string;
}

export interface Invocation {
  requestId: string;
}

export interface Context {
  log: Console;
  env: Environment;
  url: URL;
  invocation: Invocation;
  books: Book[];
}

export type Route = (
  req: Request,
  ctx: Context
) => Promise<Response | undefined | void> | Response | undefined | void;

export interface BookData {
  // path to the book, starting at repo root
  path: string;

  // fields from book.yml, used to remap request path to book content
  ditamap: string;
  dita: string;

  // attributes to use for adoc conversion
  attributes?: Record<string, string>;
}

export interface Book extends BookData {
  // check if incoming request url path is prefixed with this book's path
  match(path: string): boolean;

  // convert from request path to doc path
  resolve(path: string): string;
}
