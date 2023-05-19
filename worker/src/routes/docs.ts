import { responseInit, ContentType } from '../util';
import adoc2html from '../util/adoc2html';
import { resolveAttributes, resolvePath } from '../util/books';

import type { Context, Route } from '../types';

function trimChar(str: string, trim: string, location: 'start' | 'end' = 'start'): string {
  let trimmed = str;
  while (trimmed && trimmed[`${location}sWith`](trim)) {
    trimmed = location === 'end' ? trimmed.slice(0, -1) : trimmed.substring(1);
  }
  return trimmed;
}

export function resolveURL(path: string, ctx: Context) {
  const {
    log,
    env: {
      DOC_UPSTREAM,
      DOC_REPO_OWNER,
      DOC_REPO_NAME,
      DOC_REPO_REF,
      DOC_REPO_ROOT_PATH = '',
      BASE_PATH = '',
    },
  } = ctx;
  const ref = ctx.url.searchParams.get('branch') ?? DOC_REPO_REF;
  const resolveDitaPaths = ['true', true].includes(ctx.env.RESOLVE_DITA_PATHS);

  let rootPath = DOC_REPO_ROOT_PATH;
  rootPath = trimChar(rootPath, '/', 'end');
  rootPath = trimChar(rootPath, '/', 'start');

  let resolvedPath = path.substring(BASE_PATH.length);
  resolvedPath = trimChar(resolvedPath, '/', 'start');

  if (resolveDitaPaths) {
    resolvedPath = resolvePath(resolvedPath);
    resolvedPath = trimChar(resolvedPath, '/', 'start');

    if (!resolvedPath) {
      // fallback to direct access of docs directory
      resolvedPath = `${rootPath}${rootPath ? '/' : ''}${resolvedPath}`;
    }
  } else {
    resolvedPath = `${rootPath}${rootPath ? '/' : ''}${resolvedPath}`;
  }

  resolvedPath = trimChar(resolvedPath, '/', 'start');

  log.debug('[Docs/resolve] resolved path: ', resolvedPath);

  return `${DOC_UPSTREAM}/${DOC_REPO_OWNER}/${DOC_REPO_NAME}/${ref}/${resolvedPath}`;
}

const Docs: Route = async (req, ctx) => {
  const { log, url } = ctx;
  let { pathname } = ctx.url;
  const backend = url.searchParams.get('backend') ?? 'franklin';
  log.debug('[Docs] handle GET: ', pathname);

  let plain = false;
  if (pathname.endsWith('.plain.html')) {
    plain = true;
    pathname = pathname.slice(0, -'.plain.html'.length);
  }
  const upstream = `${resolveURL(pathname, ctx)}.adoc`;
  log.debug('[Docs] upstream: ', upstream);

  const attributes = resolveAttributes(pathname);
  [...url.searchParams.entries()].forEach(([key, val]) => {
    if (!key.startsWith('attr-')) return;
    const [_, attr] = key.split('attr-');
    attributes[attr] = val;
  });

  const resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    return resp;
  }

  const text = await resp.text();
  const html = adoc2html(text, { backend, attributes, plain });
  return new Response(html, responseInit(200, ContentType.HTML, { 'last-modified': resp.headers.get('last-modified') }));
};

export default Docs;
