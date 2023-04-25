import { responseInit, ContentType } from '../util';
import { resolveURL } from './docs';
import book2json from '../util/book2json';

import type { Route } from '../types';

const Docs: Route = async (req, ctx) => {
  const { log } = ctx;
  let { pathname } = ctx.url;
  if (pathname.endsWith('.json')) {
    pathname = pathname.slice(0, -'.json'.length);
  }
  log.debug('[Books] handle GET: ', pathname);

  const upstream = `${resolveURL(pathname, ctx)}.yml`;
  log.debug('[Books] upstream: ', upstream);

  const resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    return resp;
  }

  const text = await resp.text();
  const json = book2json(text);
  return new Response(JSON.stringify(json), responseInit(200, ContentType.JSON));
};

export default Docs;
