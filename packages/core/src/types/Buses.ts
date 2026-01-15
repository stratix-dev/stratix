import { CommandBus } from '../messaging/CommandBus.js';
import { QueryBus } from '../messaging/QueryBus.js';
import { EventBus } from '../messaging/EventBus.js';

export type Buses = CommandBus | QueryBus | EventBus;
