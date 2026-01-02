/**
 * Decorator to mark a class as injectable.
 *
 * Injectable classes are automatically registered in the DI container
 * and can be injected into other classes using @Inject.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @Inject() private userRepository!: UserRepository;
 *   @Inject() private emailService!: EmailService;
 *
 *   async createUser(email: string, name: string): Promise<User> {
 *     const user = User.create(email, name);
 *     await this.userRepository.save(user);
 *     await this.emailService.sendWelcome(user.email);
 *     return user;
 *   }
 * }
 * ```
 *
 * @category Application Decorators
 */

export function Injectable(token?: string | symbol) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Store metadata using the new context.metadata API
    if (context.metadata) {
      context.metadata['injectable'] = true;
    }
    
    return target;
  };
}