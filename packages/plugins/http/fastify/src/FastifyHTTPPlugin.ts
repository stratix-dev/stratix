import type {
  Plugin,
  PluginContext,
  HealthCheckResult,
  PluginMetadata,
  HealthStatus,
  Container,
} from '@stratix/core';
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import type {
  FastifyHTTPPluginOptions,
  RouteClass,
  RouteClassConstructor,
  RouteConfig,
  HttpRequest,
} from './types.js';
import { isHttpError } from './errors.js';

type RouteClassEntry =
  | { type: 'instance'; instance: RouteClass }
  | { type: 'constructor'; constructor: RouteClassConstructor; instance?: RouteClass };

export class FastifyHTTPPlugin implements Plugin {
  public readonly metadata: PluginMetadata = {
    name: 'fastify-http',
    version: '0.1.2',
    description: 'Fastify HTTP integration plugin',
    dependencies: [],
  };

  private server?: FastifyInstance;
  private routes: RouteConfig[] = [];
  private routeClasses: RouteClassEntry[] = [];
  private container?: Container;

  constructor(private readonly options: FastifyHTTPPluginOptions = {}) { }

  async initialize(context: PluginContext): Promise<void> {
    this.container = context.container;

    this.server = Fastify({
      trustProxy: this.options.trustProxy || false,
    });

    if (this.options.cors) {
      await this.server.register(
        cors,
        typeof this.options.cors === 'boolean' ? {} : this.options.cors
      );
    }

    this.setupErrorHandler();
    this.registerRoutes();

    context.container.register('httpServer', () => this.server);
    context.container.register('httpPlugin', () => this);
  }

  async start(): Promise<void> {
    if (!this.server) {
      throw new Error('Fastify server not initialized');
    }

    const port = this.options.port || 3000;
    const host = this.options.host || '0.0.0.0';

    await this.server.listen({ port, host });
    console.log(`HTTP server listening on ${host}:${port}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.close();
      console.log('HTTP server stopped');
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.server) {
      return {
        status: 'down' as HealthStatus,
        message: 'Server not initialized',
      };
    }

    try {
      await this.server.inject({
        method: 'GET',
        url: '/health',
      });
      return { status: 'up' as HealthStatus };
    } catch (error) {
      return {
        status: 'down' as HealthStatus,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public route<TBody = unknown, TQuery = unknown, TParams = unknown>(
    config: RouteConfig<TBody, TQuery, TParams>
  ): void {
    this.routes.push(config as RouteConfig);

    if (this.server) {
      this.registerRoute(config as RouteConfig);
    }
  }

  public routeClass<TBody = unknown, TQuery = unknown, TParams = unknown>(
    route: RouteClass<TBody, TQuery, TParams> | RouteClassConstructor<TBody, TQuery, TParams>
  ): void {
    const entry = this.normalizeRouteClass(route);
    this.routeClasses.push(entry);

    if (this.server) {
      const routeConfig = this.createRouteConfigFromClass(entry);
      this.registerRoute(routeConfig);
    }
  }

  public get<TQuery = unknown, TParams = unknown>(
    path: string,
    handler: RouteConfig<unknown, TQuery, TParams>['handler']
  ): void {
    this.route({ method: 'GET', path, handler });
  }

  public post<TBody = unknown, TParams = unknown>(
    path: string,
    handler: RouteConfig<TBody, unknown, TParams>['handler']
  ): void {
    this.route({ method: 'POST', path, handler });
  }

  public put<TBody = unknown, TParams = unknown>(
    path: string,
    handler: RouteConfig<TBody, unknown, TParams>['handler']
  ): void {
    this.route({ method: 'PUT', path, handler });
  }

  public patch<TBody = unknown, TParams = unknown>(
    path: string,
    handler: RouteConfig<TBody, unknown, TParams>['handler']
  ): void {
    this.route({ method: 'PATCH', path, handler });
  }

  public delete<TParams = unknown>(
    path: string,
    handler: RouteConfig<unknown, unknown, TParams>['handler']
  ): void {
    this.route({ method: 'DELETE', path, handler });
  }

  private registerRoutes(): void {
    if (!this.server) return;

    for (const route of this.routes) {
      this.registerRoute(route);
    }

    for (const routeClass of this.routeClasses) {
      const routeConfig = this.createRouteConfigFromClass(routeClass);
      this.registerRoute(routeConfig);
    }
  }

  private registerRoute(config: RouteConfig): void {
    if (!this.server) return;

    const path = this.options.prefix ? `${this.options.prefix}${config.path}` : config.path;

    this.server.route({
      method: config.method,
      url: path,
      schema: config.schema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const httpRequest = this.mapRequest(request);
          const httpResponse = await config.handler(httpRequest);

          if (httpResponse.headers) {
            for (const [key, value] of Object.entries(httpResponse.headers)) {
              void reply.header(key, value);
            }
          }

          const statusCode = httpResponse.statusCode || 200;
          return reply.code(statusCode).send(httpResponse.body);
        } catch (error) {
          return this.handleError(error, reply);
        }
      },
      ...config.options,
    });
  }

  private createRouteConfigFromClass(routeClass: RouteClassEntry): RouteConfig {
    const instance = this.instantiateRouteClass(routeClass);

    return {
      method: instance.method,
      path: instance.path,
      options: instance.options,
      schema: instance.schema,
      handler: (request) => instance.handle(request),
    };
  }

  private instantiateRouteClass(routeClass: RouteClassEntry): RouteClass {
    if (routeClass.type === 'instance') {
      return routeClass.instance;
    }

    if (!routeClass.instance) {
      routeClass.instance = this.createRouteClassInstance(routeClass.constructor);
    }

    return routeClass.instance;
  }

  private createRouteClassInstance(
    routeConstructor: RouteClassConstructor
  ): RouteClass {
    if (this.container?.has(routeConstructor)) {
      return this.container.resolve(routeConstructor);
    }

    return new routeConstructor();
  }

  private normalizeRouteClass(
    route: RouteClass | RouteClassConstructor
  ): RouteClassEntry {
    if (typeof route === 'function') {
      return { type: 'constructor', constructor: route };
    }

    return { type: 'instance', instance: route };
  }

  private mapRequest<TBody = unknown, TQuery = unknown, TParams = unknown>(
    request: FastifyRequest
  ): HttpRequest<TBody, TQuery, TParams> {
    return {
      body: request.body as TBody,
      query: request.query as TQuery,
      params: request.params as TParams,
      headers: request.headers as Record<string, string | string[] | undefined>,
      raw: request,
    };
  }

  private setupErrorHandler(): void {
    if (!this.server) return;

    this.server.setErrorHandler((error, _request, reply) => {
      this.handleError(error, reply);
    });
  }

  private handleError(error: unknown, reply: FastifyReply): void {
    if (isHttpError(error)) {
      const response: Record<string, unknown> = {
        error: error.code || 'ERROR',
        message: error.message,
        statusCode: error.statusCode,
      };

      if (error.details) {
        response.details = error.details;
      }

      void reply.code(error.statusCode).send(response);
      return;
    }

    if (error instanceof Error) {
      console.error('Unhandled error:', error.message, error.stack);
      void reply.code(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
      });
      return;
    }

    console.error('Unknown error:', error);
    void reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  }

  public getServer(): FastifyInstance | undefined {
    return this.server;
  }
}
