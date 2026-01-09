import { StratixApplication } from './StratixApplication.js';

/**
 * Bootstrap a Stratix application
 *
 * @param appClass - Class decorated with @StratixApp
 * @returns Initialized application instance
 *
 * @example
 * ```typescript
 * @StratixApp({
 *   name: 'MyApp',
 *   services: {
 *     logger: LoggerBuilder.production()
 *   }
 * })
 * class App {}
 *
 * const app = await bootstrap(App);
 * ```
 */
export async function bootstrap(
  appClass: new (...args: any[]) => any
): Promise<StratixApplication> {
  const app = new StratixApplication(appClass);
  await app.initialize();
  return app;
}
