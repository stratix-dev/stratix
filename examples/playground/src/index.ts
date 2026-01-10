import { StratixApp, bootstrap } from '@stratix/framework';

@StratixApp({
  name: 'User Application',
  version: '1.0.0',
  configuration: {
    configFile: 'config.yml'
  }
})
export class UserApp {}

async function main() {
  const app = await bootstrap(UserApp);
  await app.shutdown();
}

main().catch(console.error);
