import type { Route } from '../types';
import { resolveURL } from './docs';

const Media: Route = async (req, ctx) => {
  const { log } = ctx;
  log.debug('[Media] handle GET: ', ctx.url.pathname);

  const upstream = `${resolveURL(ctx.url.pathname, ctx)}`;
  log.debug('[Media] upstream: ', upstream);

  const resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
  }
  return resp;
};

export default Media;
