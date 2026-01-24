import { MetadataRegistry } from '../metadata/MetadataRegistry.js';
import { ContainerFactory } from './factories/ContainerFactory.js';
import { Container } from '../core/ports/Container.js';
import { AwilixContainerFactory } from '../infrastructure/di/AwilixContainerFactory.js';
import { exit } from 'process';
import { ClassConstructorType } from '../core/types/UtilityTypes.js';

export interface StratixApplicationOptions {
  appClass: ClassConstructorType;
  registry?: MetadataRegistry;
  containerFactory?: ContainerFactory;
}

export class StratixApplication {
  private readonly container: Container;
  private readonly stratixApplicationOptions: StratixApplicationOptions;

  constructor(options: StratixApplicationOptions) {
    this.stratixApplicationOptions = options;
    this.stratixApplicationOptions.registry =
      options?.registry ?? new MetadataRegistry({ appClass: options.appClass });
    const factory = options.containerFactory ?? new AwilixContainerFactory();
    this.container = factory.create({ injectionMode: 'proxy', strict: true });
  }

  initialize(): void {
    this.registerBuses();
    this.registerHandlers();
  }

  registerBuses(): void {}

  registerHandlers(): void {}

  async shutdown(): Promise<void> {
    await this.container.dispose();
    exit(0);
  }
}
