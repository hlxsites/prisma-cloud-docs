import { responseInit, ContentType } from '../util';

import type { Context, Route } from "../types";

const Franklin: Route = async (req, ctx) => {
  const { log, url, env } = ctx;
  const backend = url.searchParams.get('backend') ?? 'franklin';
  log.debug('[Franklin] handle GET: ', ctx.url.pathname);

  const upstream = `${env.CONTENT_UPSTREAM}${ctx.url.pathname}${ctx.url.search}`;
  log.debug('[Franklin] upstream: ', upstream);

  const resp = await fetch(upstream);
  return resp;
}

export default Franklin;