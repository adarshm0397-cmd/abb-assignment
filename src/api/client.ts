import type { ApiErrorBody } from './types';

const apiBaseUrl = globalThis.__VITE_API_BASE_URL__ ?? '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorBody['error']['details'];

  constructor(status: number, body: ApiErrorBody['error'] | undefined) {
    super(body?.message ?? `Request failed with status ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code ?? 'INTERNAL_ERROR';
    this.details = body?.details;
  }
}

const isApiErrorBody = (value: unknown): value is ApiErrorBody => {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    'code' in error &&
    typeof error.code === 'string'
  );
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => undefined)
    : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, isApiErrorBody(body) ? body.error : undefined);
  }

  return body as T;
};

export const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  return parseResponse<T>(response);
};
