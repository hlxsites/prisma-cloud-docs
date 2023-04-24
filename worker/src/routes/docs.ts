import { responseInit, ContentType } from '../util';
import adoc2html from '../util/adoc2html';
import { resolveAttributes, resolvePath } from '../util/books';

import type { Context, Route } from '../types';

export function resolveURL(path: string, ctx: Context) {
  const {
    env: {
      DOC_UPSTREAM,
      DOC_REPO_OWNER,
      DOC_REPO_NAME,
      DOC_REPO_REF,
      DOC_REPO_ROOT_PATH = '',
    },
  } = ctx;
  let rootPath = DOC_REPO_ROOT_PATH;
  if (rootPath.startsWith('/')) {
    rootPath = rootPath.substring(1);
  }
  if (rootPath.endsWith('/')) {
    rootPath = rootPath.slice(0, -1);
  }
  let fullPath = resolvePath(path);
  if (!fullPath) {
    // fallback to direct access of docs directory
    fullPath = `${rootPath}${rootPath ? '/' : ''}${path}`;
  }
  if (fullPath.startsWith('/')) {
    fullPath = fullPath.substring(1);
  }
  console.debug('[Docs/resolve] resolved path: ', fullPath);

  return `${DOC_UPSTREAM}/${DOC_REPO_OWNER}/${DOC_REPO_NAME}/${DOC_REPO_REF}/${fullPath}`;
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
  return new Response(html, responseInit(200, ContentType.HTML));
};

export default Docs;
