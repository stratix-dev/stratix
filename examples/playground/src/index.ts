import { LoggerBuilder, StratixApp, bootstrap } from '@stratix/framework';

@StratixApp({
  name: 'User Application',
  configuration: {
    configFile: './config.yml'
  },
  services: {
    logger: LoggerBuilder.development()
  }
})
export class UserApp {}

async function main() {
  const app = await bootstrap(UserApp);
  await app.shutdown();
}

main().catch(console.error);
