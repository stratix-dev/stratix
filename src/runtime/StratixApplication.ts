import { ContainerFactory } from './factories/ContainerFactory.js';
import { Container } from '../core/ports/Container.js';
import { AwilixContainerFactory } from '../infrastructure/di/AwilixContainerFactory.js';
import { exit } from 'process';
import { ClassConstructorType } from '../core/types/UtilityTypes.js';
import { GlobContextScanner } from '../infrastructure/scanner/GlobContextScanner.js';
import { DEFAULT_CONTEXT_PATTERNS } from '../config/ContextPatterns.js';
import { toCamelCase } from '../functions/strings.js';
import { DependencyLifetime } from '../core/types/DependencyLifetime.js';

export interface StratixApplicationOptions {
  appClass: ClassConstructorType;
  scanDirs?: string[];
  ignoreFiles?: string[];
  containerFactory?: ContainerFactory;
  diMode?: 'proxy' | 'classic';
}

export class StratixApplication {
  private readonly container: Container;
  private readonly contextScanner: GlobContextScanner;

  constructor(options: StratixApplicationOptions) {
    const factory = options.containerFactory ?? new AwilixContainerFactory();
    this.container = factory.create({ injectionMode: options.diMode ?? 'proxy', strict: true });

    this.contextScanner = new GlobContextScanner({
      scanDirs: options.scanDirs ?? ['src/'],
      patterns: DEFAULT_CONTEXT_PATTERNS,
      ignore: options.ignoreFiles ?? [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.spec.*',
        '**/*.test.*'
      ]
    });
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  async initialize(): Promise<void> {
    const contexts = await this.contextScanner.scan();

    for (const contextPath of contexts) {
      const contextModule = await import(contextPath);

      for (const exportKey in contextModule) {
        const ContextClass = contextModule[exportKey];
        if (typeof ContextClass === 'function') {
          const className: string = ContextClass.name;
          const registrationId: string = toCamelCase(className);
          this.container.registerClass(registrationId, ContextClass, {
            lifetime: DependencyLifetime.SINGLETON
          });
        }
      }
    }
  }

  scanContexts(): void {}

  registerBuses(): void {}

  registerHandlers(): void {}

  async shutdown(): Promise<void> {
    await this.container.dispose();
    exit(0);
  }
}
