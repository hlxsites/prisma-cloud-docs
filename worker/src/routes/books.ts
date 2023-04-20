import { responseInit, ContentType } from '../util';
import adoc2html from '../util/adoc2html';
import { resolveURL } from './docs';

import type { Route } from '../types';

const Docs: Route = async (req, ctx) => {
  const { log, url } = ctx;
  const backend = url.searchParams.get('backend') ?? 'franklin';
  log.debug('[Books] handle GET: ', ctx.url.pathname);

  const upstream = `${resolveURL(ctx.url.pathname, ctx)}.yml`;
  log.debug('[Books] upstream: ', upstream);

  const resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
    return resp;
  }

  const text = await resp.text();
  const html = adoc2html(text, { backend });
  return new Response(html, responseInit(200, ContentType.HTML));
};

export default Docs;
