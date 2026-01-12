import type { ConfigurationSource, ClassConstructor } from '@stratix/core';

export interface StratixAppMetadata {
  name: string;
  version: string;
  configuration?: {
    sources?: ConfigurationSource[];
    configFile?: string;
    envPrefix?: string;
  };
  contexts?: ClassConstructor[];
}

export interface CommandHandlerMetadata {
  handlerClass?: ClassConstructor;
  commandClass?: ClassConstructor;
}

export class MetadataStorage {
  private static appByClass = new Map<ClassConstructor, StratixAppMetadata>();
  private static commandHandlerByClass = new Map<ClassConstructor, CommandHandlerMetadata>();

  //*************************
  // APP METADATA
  //*************************
  static setAppMetadata(target: ClassConstructor, metadata: StratixAppMetadata): void {
    this.appByClass.set(target, metadata);
  }
  static getAppMetadata(target: ClassConstructor): StratixAppMetadata | undefined {
    return this.appByClass.get(target);
  }

  //*************************
  // COMMAND HANDLER METADATA
  //*************************
  static setCommandHandlerMetadata(
    target: ClassConstructor,
    metadata: CommandHandlerMetadata
  ): void {
    this.commandHandlerByClass.set(target, metadata);
  }
  static getCommandHandlerMetadata(target: ClassConstructor): CommandHandlerMetadata | undefined {
    return this.commandHandlerByClass.get(target);
  }
  static getAllCommandHandlerMetadata(): CommandHandlerMetadata[] {
    return Array.from(this.commandHandlerByClass.values());
  }

  static clear(): void {
    this.appByClass.clear();
    this.commandHandlerByClass.clear();
  }

  /**
   * Get count of all registered metadata entries
   */
  static getStats(): {
    apps: number;
    commandHandlers: number;
  } {
    return {
      apps: this.appByClass.size,
      commandHandlers: this.commandHandlerByClass.size
    };
  }
}
