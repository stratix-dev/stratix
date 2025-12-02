import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Container, PluginContext } from '@stratix/core';
import { FastifyHTTPPlugin } from '../FastifyHTTPPlugin.js';
import { BaseRoute, type RouteClass } from '../types.js';

describe('FastifyHTTPPlugin route classes', () => {
  let plugin: FastifyHTTPPlugin;
  let mockContext: PluginContext;
  let mockContainer: Container;
  let hasMock: ReturnType<typeof vi.fn>;
  let resolveMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    plugin = new FastifyHTTPPlugin();

    const register = vi.fn();
    resolveMock = vi.fn();
    hasMock = vi.fn();
    const tryResolve = vi.fn();
    const createScope = vi.fn();
    const dispose = vi.fn();
    const singleton = vi.fn();
    const scoped = vi.fn();
    const transient = vi.fn();
    const registerClass = vi.fn();
    const registerAll = vi.fn();

    mockContainer = {
      register,
      resolve: resolveMock,
      has: hasMock,
      tryResolve,
      createScope: createScope as unknown as Container['createScope'],
      dispose: dispose as unknown as Container['dispose'],
      singleton: singleton as unknown as Container['singleton'],
      scoped: scoped as unknown as Container['scoped'],
      transient: transient as unknown as Container['transient'],
      registerClass: registerClass as unknown as Container['registerClass'],
      registerAll: registerAll as unknown as Container['registerAll'],
    } as unknown as Container;

    mockContext = {
      container: mockContainer,
      getConfig: vi.fn(),
      getService: vi.fn(),
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        log: vi.fn(),
        fatal: vi.fn(),
      },
    };
  });

  it('registers a route defined as a class instance', async () => {
    class PingRoute extends BaseRoute {
      constructor() {
        super('GET', '/ping');
      }
      handle() {
        return Promise.resolve({
          statusCode: 200,
          body: { pong: true },
        });
      }
    }

    plugin.routeClass(new PingRoute());
    await plugin.initialize(mockContext);

    const server = plugin.getServer();
    expect(server).toBeDefined();

    await server?.ready();
    const response = await server?.inject({ method: 'GET', url: '/ping' });

    expect(response?.statusCode).toBe(200);
    expect(response?.json()).toEqual({ pong: true });
  });

  it('instantiates a route class via the container when available', async () => {
    const greeter = { greet: () => 'hola' };

    class GreetingRoute implements RouteClass {
      readonly method = 'GET' as const;
      path = '/greet';
      private readonly service: { greet: () => string };

      constructor(...args: unknown[]) {
        const [service] = args as [{ greet: () => string }];
        this.service = service;
      }

      handle() {
        return Promise.resolve({
          statusCode: 200,
          body: { message: this.service.greet() },
        });
      }
    }

    hasMock.mockImplementation(() => true);
    resolveMock.mockImplementation(() => new GreetingRoute(greeter));

    plugin.routeClass(GreetingRoute);
    await plugin.initialize(mockContext);

    const server = plugin.getServer();
    expect(server).toBeDefined();

    await server?.ready();
    const response = await server?.inject({ method: 'GET', url: '/greet' });

    expect(hasMock).toHaveBeenCalledWith(GreetingRoute);
    expect(resolveMock).toHaveBeenCalledWith(GreetingRoute);
    expect(response?.statusCode).toBe(200);
    expect(response?.json()).toEqual({ message: 'hola' });
  });
});
