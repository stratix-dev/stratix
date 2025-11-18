import type { PluginContext } from '@stratix/abstractions';
import { BaseContextPlugin } from '@stratix/runtime';

export class UsersContextPlugin extends BaseContextPlugin {
  name = 'users-context';
  version = '1.0.0';

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);
  }

  getCommands() {
    return [];
  }

  getQueries() {
    return [];
  }

  getEventHandlers() {
    return [];
  }

  getRepositories() {
    return [];
  }
}
