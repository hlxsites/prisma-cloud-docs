import type { Route } from '../types';
import { resolveURL } from './docs';

const Media: Route = async (req, ctx) => {
  const { log } = ctx;
  log.debug('[Media] handle GET: ', ctx.url.pathname);

  const upstream = `${await resolveURL(ctx.url.pathname, ctx)}`;
  log.debug('[Media] upstream: ', upstream);

  let resp = await fetch(upstream);
  if (!resp.ok) {
    if (resp.status === 404) {
      return undefined;
    }
  }
  resp = new Response(resp.body, resp);
  const contentType = resp.headers.get('content-type');
  // Workaround for some gifs showing as octet-stream mime type from Github;
  // force them to be image/gif if they have the appropriate extension.
  // This could be extended for other mime types if needed, but for now gifs is enough.
  if (ctx.url.pathname.endsWith('.gif') && contentType === 'application/octet-stream') {
    resp.headers.set('content-type', 'image/gif');
  }
  return resp;
};

export default Media;
