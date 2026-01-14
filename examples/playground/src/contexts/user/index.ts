import { Context } from '@stratix/framework';
import { CreateUserCommandHandler } from './application/CreateUserCommandHandler.js';
import { DeleteUserCommandHandler } from './application/DeleteUserCommandHandler.js';

@Context({
  commandHandlers: [CreateUserCommandHandler, DeleteUserCommandHandler]
})
export class UserContext {}
