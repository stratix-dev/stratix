/**
 * Decorator to inject dependencies into properties.
 *
 * Can be used in two ways:
 * 1. Without token: Auto-resolves by type (recommended)
 * 2. With token: Resolves by explicit string token
 *
 * Note: Stage 3 decorators don't support parameter decorators.
 * Use property injection instead of constructor injection.
 *
 * @param token - Optional token to resolve (string or symbol)
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Inject() private userRepository!: UserRepository;  // By type
 *   @Inject('CACHE') private cache!: Cache;             // By token
 * }
 * ```
 *
 * @category Application Decorators
 */
export function Inject(token?: string | symbol) {
  return function <T>(
    _target: undefined,
    context: ClassFieldDecoratorContext<any, T>
  ) {
    // Store injection metadata
    const fieldName = String(context.name);
    if (context.metadata) {
      context.metadata[`inject:${fieldName}`] = token || fieldName;
    }
    
    return function(this: any, initialValue: T): T {
      // This will be handled by the DI container during resolution
      return initialValue;
    };
  };
}