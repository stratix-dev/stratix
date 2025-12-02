import type { FastifyRequest, RouteShorthandOptions } from 'fastify';

/**
 * HTTP method types.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Route configuration for HTTP endpoints.
 *
 * @template TBody - Request body type
 * @template TQuery - Query parameters type
 * @template TParams - Route parameters type
 */
export interface RouteConfig<TBody = unknown, TQuery = unknown, TParams = unknown> {
  method: HttpMethod;
  path: string;
  handler: RouteHandler<TBody, TQuery, TParams>;
  options?: RouteShorthandOptions;
  schema?: RouteSchema<TBody, TQuery, TParams>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface RouteSchema<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body?: unknown;
  querystring?: unknown;
  params?: unknown;
  response?: {
    [statusCode: number]: unknown;
  };
}

export interface RouteHandler<TBody = unknown, TQuery = unknown, TParams = unknown> {
  (request: HttpRequest<TBody, TQuery, TParams>): Promise<HttpResponse>;
}

export interface RouteClass<TBody = unknown, TQuery = unknown, TParams = unknown> {
  method: HttpMethod;
  path: string;
  options?: RouteShorthandOptions;
  schema?: RouteSchema<TBody, TQuery, TParams>;
  handle(request: HttpRequest<TBody, TQuery, TParams>): Promise<HttpResponse>;
}

export type RouteClassConstructor<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> = new (...args: unknown[]) => RouteClass<TBody, TQuery, TParams>;

export abstract class BaseRoute<TBody = unknown, TQuery = unknown, TParams = unknown>
implements RouteClass<TBody, TQuery, TParams> {
  constructor(
    public readonly method: HttpMethod,
    public readonly path: string,
    public readonly options?: RouteShorthandOptions,
    public readonly schema?: RouteSchema<TBody, TQuery, TParams>,
  ) { }

  abstract handle(request: HttpRequest<TBody, TQuery, TParams>): Promise<HttpResponse>;
}

export interface HttpRequest<TBody = unknown, TQuery = unknown, TParams = unknown> {
  body: TBody;
  query: TQuery;
  params: TParams;
  headers: Record<string, string | string[] | undefined>;
  raw: FastifyRequest;
}

export interface HttpResponse {
  statusCode?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Configuration options for Fastify HTTP plugin.
 */
export interface FastifyHTTPPluginOptions {
  /** Server port @default 3000 */
  port?: number;
  /** Server host @default '0.0.0.0' */
  host?: string;
  /** Route prefix for all routes */
  prefix?: string;
  /** CORS configuration */
  cors?:
  | boolean
  | {
    origin?: string | string[] | boolean;
    methods?: string[];
    credentials?: boolean;
  };
  /** Trust proxy headers @default false */
  trustProxy?: boolean;
}

/**
 * HTTP error with status code.
 */
export interface HttpError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;
}
