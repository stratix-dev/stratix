import { StratixApp } from '@stratix/framework';
import { UserContext } from '../contexts/user/index.js';

@StratixApp({
  name: 'User Application',
  configuration: {
    configFile: './config.yml'
  },
  contexts: [UserContext]
})
export class UserApp {}
