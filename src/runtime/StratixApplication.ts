import { ContainerFactory } from './factories/ContainerFactory.js';
import { Container } from '../core/ports/Container.js';
import { AwilixContainerFactory } from '../infrastructure/di/AwilixContainerFactory.js';
import { exit } from 'process';
import { ClassConstructorType } from '../core/types/UtilityTypes.js';
import { GlobContextScanner } from '../infrastructure/scanner/GlobContextScanner.js';
import { DEFAULT_CONTEXT_INJECTABLE_PATTERNS, DEFAULT_STRATIX_CONFIG } from '../config/DefaultContext.js';
import { toCamelCase } from '../functions/strings.js';
import { DependencyLifetime } from '../core/types/DependencyLifetime.js';
import {
  InjectableAnalyzer,
  InjectableType
} from '../infrastructure/scanner/InjectableAnalyzer.js';

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
  private readonly injectableAnalyzer: InjectableAnalyzer;

  constructor(options: StratixApplicationOptions) {
    const factory = options.containerFactory ?? new AwilixContainerFactory();
    this.container = factory.create({ injectionMode: options.diMode ?? DEFAULT_STRATIX_CONFIG.diMode, strict: true });

    this.contextScanner = new GlobContextScanner({
      scanDirs: options.scanDirs ?? DEFAULT_STRATIX_CONFIG.scanDirs,
      patterns: DEFAULT_CONTEXT_INJECTABLE_PATTERNS,
      ignore: options.ignoreFiles ?? DEFAULT_STRATIX_CONFIG.ignoreFiles
    });

    this.injectableAnalyzer = new InjectableAnalyzer();
  }

  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  async initialize(): Promise<void> {
    const contexts = await this.contextScanner.scan();

    for (const contextPath of contexts) {
      const contextModule = await import(contextPath);

      for (const exportKey in contextModule) {
        const exportedItem = contextModule[exportKey];
        const analysis = this.injectableAnalyzer.analyze(exportedItem, exportKey, contextPath);

        switch (analysis.type) {
          case InjectableType.CLASS:
            this.registerClass(exportedItem, exportKey, analysis.lifetime);
            break;

          case InjectableType.FUNCTION:
            this.registerFunction(exportedItem, exportKey, analysis.lifetime);
            break;

          case InjectableType.VALUE:
            this.registerValue(exportedItem, exportKey);
            break;

          case InjectableType.NONE:
            console.debug(`[DI] Skipped: ${exportKey} - ${analysis.reason}`);
            break;
        }
      }
    }
  }

  private registerClass(
    ClassConstructor: Function,
    _exportKey: string,
    lifetime?: DependencyLifetime
  ): void {
    const className = ClassConstructor.name;
    const registrationId = toCamelCase(className);

    this.container.registerClass(registrationId, ClassConstructor as ClassConstructorType, {
      lifetime: lifetime ?? DependencyLifetime.SINGLETON
    });

    console.info(`[DI] Class: ${className} → ${registrationId}`);
  }

  private registerFunction(func: Function, exportKey: string, lifetime?: DependencyLifetime): void {
    this.container.registerFunction(exportKey, func as () => unknown, {
      lifetime: lifetime ?? DependencyLifetime.SINGLETON
    });

    console.info(`[DI] Function: ${exportKey}`);
  }

  private registerValue(value: unknown, exportKey: string): void {
    this.container.registerValue(exportKey, value);
    console.info(`[DI] Value: ${exportKey}`);
  }

  scanContexts(): void {}

  registerBuses(): void {}

  registerHandlers(): void {}

  async shutdown(): Promise<void> {
    await this.container.dispose();
    exit(0);
  }
}
