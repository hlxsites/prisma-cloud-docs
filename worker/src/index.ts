import { v4 as uuidv4 } from 'uuid';
import setupCtx from './context';
import handleRequest from './handler';
import {
  isErrorWithResponse,
  errorResponse,
  noCacheResponseInit,
  ErrorWithResponse,
} from './util';

import type { Context, Environment } from './types';

export default {
  async fetch(request: Request, env: Partial<Environment>) {
    const requestId = uuidv4();
    let resp: Response | undefined;
    let ctx: Context;

    try {
      ctx = setupCtx(request, env, requestId);
      resp = await handleRequest(request, ctx);
    } catch (e) {
      const err = e as Error | ErrorWithResponse;
      if (isErrorWithResponse(err)) {
        resp = err.response;
      } else {
        console.error('[index] fatal error: ', e);
        resp = errorResponse(500, err.message, 'internal error');
      }
    }

    if (resp) {
      resp = new Response(
        resp.body,
        resp,
      );
    } else {
      resp = new Response(null, noCacheResponseInit(404));
    }

    resp.headers.set('x-request-id', requestId);
    return resp;
  },
};
