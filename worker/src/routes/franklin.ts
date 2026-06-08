import type { Route } from '../types';

const Franklin: Route = async (req, ctx) => {
  const { log, env } = ctx;
  log.debug('[Franklin] handle GET: ', ctx.url.pathname);

  const upstream = `${env.CONTENT_UPSTREAM}${ctx.url.pathname}${ctx.url.search}`;
  log.debug('[Franklin] upstream: ', upstream);

  const resp = await fetch(upstream);
  // TODO: tweak headers
  return resp;
};

export default Franklin;
