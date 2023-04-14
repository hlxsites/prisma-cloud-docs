import { responseInit, ContentType } from '../util';
import adoc2html from '../util/adoc2html';

import type { Context, Route } from "../types";

function resolveURL(path: string, ctx: Context) {
  const {
    env: {
      CONTENT_UPSTREAM,
      CONTENT_REPO_OWNER,
      CONTENT_REPO_NAME,
      CONTENT_REPO_REF,
      CONTENT_REPO_ROOT_PATH = ''
    }
  } = ctx;
  let rootPath = CONTENT_REPO_ROOT_PATH;
  if (rootPath.startsWith('/')) {
    rootPath = rootPath.substring(1);
  }
  if (rootPath.endsWith('/')) {
    rootPath = rootPath.slice(0, -1);
  }
  const fullPath = `${rootPath}${rootPath ? '/' : ''}${path.startsWith('/') ? path.substring(1) : path}`;
  return `${CONTENT_UPSTREAM}/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/${CONTENT_REPO_REF}/${fullPath}.adoc`
}

const Docs: Route = async (req, ctx) => {
  const { log } = ctx;
  log.debug('[Docs] handle GET: ', ctx.url.pathname);

  const upstream = resolveURL(ctx.url.pathname, ctx);
  log.debug('[Docs] upstream: ', upstream);

  const resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    return resp;
  }

  const text = await resp.text();


  const html = adoc2html(text);
  return new Response(html as string, responseInit(200, ContentType.HTML));
}

export default Docs;