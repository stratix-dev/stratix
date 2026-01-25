import { StratixApplication } from './StratixApplication.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function bootstrap(
  appClass: new (...args: any[]) => any,
  scanDirs?: string[]
): Promise<StratixApplication> {
  // Create application instance
  const app = new StratixApplication({
    appClass,
    scanDirs
  });

  await app.initialize();

  return app;
}
