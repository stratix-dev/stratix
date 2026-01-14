import { bootstrap, StratixApp } from '@stratix/framework';
import { UserContext } from './contexts/user/index.js';

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
  const app = await bootstrap(UserApp);
  console.log('Application started:', app);
}

main().catch(console.error);
