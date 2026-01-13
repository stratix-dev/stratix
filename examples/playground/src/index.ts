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
  console.log('Execute bootstrap from client app...');
  await bootstrap(UserApp);
}

main().catch(console.error);
