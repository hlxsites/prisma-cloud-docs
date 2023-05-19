export type IResponseInit = ResponseInit & { headers: Record<string, string> };

export const enum ContentType {
  JSON = 'application/json',
  HTML = 'text/html; charset=utf-8'
}

function headersInit(contentType?: string, headers = {}) {
  return {
    'access-control-allow-origin': '*',
    ...(contentType ? { 'content-type': contentType } : {}),
    ...headers,
  };
}

export const responseInit = (
  status: number,
  contentType?: string,
  headers: Record<string, string> = {},
): IResponseInit => {
  return {
    status,
    headers: headersInit(contentType, {
      'cache-control': 'max-age=7200',
      ...headers,
    }),
  };
};

export const noCacheResponseInit = (status: number, contentType?: string): IResponseInit => {
  return {
    status,
    headers: headersInit(contentType, {
      'cache-control': 'max-age=0, must-revalidate, no-cache, no-store',
    }),
  };
};

export const redirectResponseInit = (location: string): IResponseInit => {
  return {
    status: 302,
    headers: headersInit(undefined, {
      location,
    }),
  };
};

export const errorResponse = (
  status: number,
  xError: string,
  message?: string,
): Response => {
  const init = noCacheResponseInit(status, message ? ContentType.JSON : undefined);
  return new Response(message ? JSON.stringify({ message }) : null, {
    ...init,
    headers: {
      ...init.headers,
      'x-error': xError,
    },
  });
};
