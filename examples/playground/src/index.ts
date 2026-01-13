import { bootstrap, StratixApp } from '@stratix/framework';
import { UserContext } from './user/index.js';

@StratixApp({
  name: 'User Application',
  configuration: {
    configFile: './config.yml'
  },
  contexts: [UserContext]
})
export class UserApp {}

async function main() {
  await bootstrap(UserApp);
}

main().catch(console.error);
