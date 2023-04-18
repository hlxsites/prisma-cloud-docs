import { responseInit, ContentType } from '../util';
import adoc2html from '../util/adoc2html';

import type { Context, Route } from "../types";

// temp for testing
import testStr from './test';
const TEST_DOC = testStr;

function resolveURL(path: string, ctx: Context) {
  const {
    env: {
      DOC_UPSTREAM,
      DOC_REPO_OWNER,
      DOC_REPO_NAME,
      DOC_REPO_REF,
      DOC_REPO_ROOT_PATH = ''
    }
  } = ctx;
  let rootPath = DOC_REPO_ROOT_PATH;
  if (rootPath.startsWith('/')) {
    rootPath = rootPath.substring(1);
  }
  if (rootPath.endsWith('/')) {
    rootPath = rootPath.slice(0, -1);
  }
  const fullPath = `${rootPath}${rootPath ? '/' : ''}${path.startsWith('/') ? path.substring(1) : path}`;
  return `${DOC_UPSTREAM}/${DOC_REPO_OWNER}/${DOC_REPO_NAME}/${DOC_REPO_REF}/${fullPath}.adoc`
}

const Docs: Route = async (req, ctx) => {
  const { log, url } = ctx;
  const backend = url.searchParams.get('backend') ?? 'franklin';
  log.debug('[Docs] handle GET: ', ctx.url.pathname);

  const upstream = resolveURL(ctx.url.pathname, ctx);
  log.debug('[Docs] upstream: ', upstream);

  let text: string = TEST_DOC;

  if (!text) {
    const resp = await fetch(upstream);
    if (!resp.ok) {
      if (resp.status === 404) {
        return undefined;
      }
      return resp;
    }

    text = await resp.text();
  }

  const html = adoc2html(text, { backend });
  return new Response(html as string, responseInit(200, ContentType.HTML));
}

export default Docs;