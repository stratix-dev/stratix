import { AwilixContainer, createContainer } from 'awilix';
import { MetadataStorage } from './MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { ClassConstructor, CommandBus, Container, EventBus, Logger, QueryBus } from '@stratix/core';
import { AwilixContainerAdapter } from './AwilixContainerAdapter.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { StratixLogger } from './StratixLogger.js';

export class StratixApplication {
  public readonly container: Container;
  private readonly awilixContainer: AwilixContainer;
  private readonly appClass: ClassConstructor;

  constructor(appClass: new (...args: any[]) => any) {
    this.appClass = appClass;
    this.awilixContainer = createContainer();
    this.container = new AwilixContainerAdapter(this.awilixContainer);
  }

  initialize(): void {
    const appMetadata = MetadataStorage.getAppMetadata(this.appClass);

    if (!appMetadata) {
      throw new StratixError(Error.RUNTIME_ERROR, 'Application metadata not found');
    }

    this.registerCoreServices();
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down application...');
    await this.container.dispose();
  }

  private registerCoreServices(): void {
    this.container.registerClass<Logger>('logger', StratixLogger);
    this.container.registerClass<EventBus>('eventBus', InMemoryEventBus);
    this.container.registerClass<CommandBus>('commandBus', InMemoryCommandBus);
    this.container.registerClass<QueryBus>('queryBus', InMemoryQueryBus);
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token as string);
  }
}
