import { StratixApplication } from './StratixApplication.js';

export  function bootstrap(
  appClass: new (...args: any[]) => any,
): StratixApplication {
  const app = new StratixApplication(appClass);
  app.initialize();
  return app;
}
