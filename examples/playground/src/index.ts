import { StratixApp, bootstrap } from '@stratix/framework';
import { CreateUserCommand } from './user/application/CreateUserCommand.js';
import { CommandBus } from '@stratix/core';
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
  const app = await bootstrap(UserApp);

  console.log('Command Created');
  const command = new CreateUserCommand('john_doe', 'john@example.com');

  console.log('Resolving CommandBus and dispatching command');
  const commandBus = app.resolve<CommandBus>('CommandBus');

  console.log('Dispatching Command');
  await commandBus.dispatch(command);

  await app.shutdown();
}

main().catch(console.error);
