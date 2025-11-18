import type { PluginContext } from '@stratix/abstractions';
import { BaseContextPlugin } from '@stratix/runtime';

export class OrdersContextPlugin extends BaseContextPlugin {
  name = 'orders-context';
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
