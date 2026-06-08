import { errorResponse } from './response';

export type ErrorWithResponse = Error & { response: Response };

export const isErrorWithResponse = (obj: unknown): obj is ErrorWithResponse => {
  return obj && typeof obj === 'object' && (obj as Record<string, unknown>).response instanceof Response;
};

export const throwableResponse = (
  statusCode: number,
  xError: string,
  message?: string,
): ErrorWithResponse => {
  const error = Error(xError) as ErrorWithResponse;
  error.response = errorResponse(statusCode, xError, message);
  return error;
};
