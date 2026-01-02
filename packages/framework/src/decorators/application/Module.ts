
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Provider type for dependency injection.
 */
export type Provider =
  | { new (...args: any[]): any }
  | { provide: string | symbol | { new (...args: any[]): any }; useClass: { new (...args: any[]): any } }
  | { provide: string | symbol | { new (...args: any[]): any }; useValue: any }
  | { provide: string | symbol | { new (...args: any[]): any }; useFactory: (...args: any[]) => any };

/**
 * Metadata for the @Module decorator.
 */
export interface ModuleDecoratorMetadata {
  /**
   * Other modules to import (their exported providers become available).
   */
  imports?: Array<{ new (...args: any[]): any }>;

  /**
   * Providers to register in this module's container.
   * Can be classes or provider objects.
   */
  providers?: Provider[];

  /**
   * Providers to export (make available to modules that import this one).
   */
  exports?: Array<string | symbol | { new (...args: any[]): any }>;
}

/**
 * Decorator to mark a class as a Module (bounded context).
 *
 * Modules are self-contained units that group related functionality.
 * They automatically discover and register:
 * - Commands and CommandHandlers
 * - Queries and QueryHandlers
 * - Event handlers
 * - Providers (services, repositories, etc.)
 *
 * @param metadata - Module configuration
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [SharedModule],
 *   providers: [
 *     UserRepository,
 *     { provide: 'CACHE', useValue: redisCache },
 *     { provide: EmailService, useClass: SendGridEmailService }
 *   ],
 *   exports: [UserRepository]
 * })
 * export class UserModule {}
 * ```
 *
 * @category Application Decorators
 */
export function Module(metadata: ModuleDecoratorMetadata = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    const {
      imports = [],
      providers = [],
      exports: moduleExports = [],
    } = metadata;

    // Store in context metadata
    if (context.metadata) {
      context.metadata['module'] = {
        imports,
        providers,
        exports: moduleExports,
      };
    }

    // Register module metadata in global storage
    MetadataStorage.registerModule(target, {
      target,
      imports,
      providers,
      exports: moduleExports,
    });

    return target;
  };
}
