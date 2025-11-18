export function generatePlugin(
  pluginName: string,
  pluginKebab: string,
  withHealthCheck: boolean
): string {
  const healthCheckMethod = withHealthCheck
    ? `
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // TODO: Implement health check logic
      return {
        healthy: true,
        message: '${pluginName} is healthy',
      };
    } catch (error) {
      return {
        healthy: false,
        message: \`${pluginName} health check failed: \${error}\`,
        error,
      };
    }
  }`
    : '';

  return `import type { Plugin, PluginContext${
    withHealthCheck ? ', HealthCheckResult' : ''
  } } from '@stratix/abstractions';

export interface ${pluginName}PluginOptions {
  // Add your plugin configuration options here
}

export class ${pluginName}Plugin implements Plugin {
  readonly name = '${pluginKebab}';
  readonly version = '0.1.0';
  readonly dependencies: string[] = [];

  constructor(private options: ${pluginName}PluginOptions = {}) {}

  async initialize(context: PluginContext): Promise<void> {
    const { container, logger } = context;
    
    logger.info(\`Initializing \${this.name} plugin\`);

    // TODO: Register services with DI container
    // container.register('myService', () => new MyService(this.options));
  }

  async start(): Promise<void> {
    // TODO: Start plugin services
    // Examples:
    // - Connect to database
    // - Start HTTP server
    // - Subscribe to message queue
  }

  async stop(): Promise<void> {
    // TODO: Stop plugin services and cleanup
    // Examples:
    // - Close database connections
    // - Stop HTTP server
    // - Unsubscribe from message queue
  }${healthCheckMethod}
}
`;
}
