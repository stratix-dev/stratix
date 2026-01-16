import { bootstrap, StratixApp, YamlConfigurationSource } from '@stratix/framework';
import { UserContext } from './contexts/user/index.js';

@StratixApp({
  name: 'User Application',
  configuration: {
    sources: [YamlConfigurationSource],
    configFile: './stratix.config.yml'
  },
  contexts: [UserContext]
})
export class UserApp {}

async function main() {
  await bootstrap(UserApp);
}

main().catch(console.error);
