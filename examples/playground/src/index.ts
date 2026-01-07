import { StratixApp, bootstrap, Logger } from '@stratix/framework';
import type { Logger as ILogger } from '@stratix/core';

@StratixApp()
export class UserApp {
  @Logger()
  private readonly logger!: ILogger;

  async onApplicationReady(): Promise<void> {
    this.logger.info('Application is ready');
  }
}

console.log('User App Loaded');

async function main() {
  const app = await bootstrap(UserApp);
  const eventBus = app.container.resolve('commandBus');

  console.log(eventBus);

  await app.shutdown();
}

main().catch(console.error);
