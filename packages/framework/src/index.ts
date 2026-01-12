// Stratix Framework

// Core decorators
export { StratixApp, type StratixAppOptions } from './docorators/StratixApp.js';
export { Context, type ContextOptions } from './docorators/Context.js';
// Handler decorators
export { CommandHandler, type CommandHandlerOptions } from './docorators/CommandHandler.js';

// DI decorators
/* export { Injectable, type InjectableOptions } from './docorators/Injectable.js'; */

// Runtime
export { bootstrap } from './runtime/bootstrap.js';
export { StratixApplication } from './runtime/StratixApplication.js';
export { MetadataStorage } from './runtime/MetadataStorage.js';

// Metadata types
export type { StratixAppMetadata } from './runtime/MetadataStorage.js';

// Logging
export { LoggerBuilder } from './logging/LoggerBuilder.js';
export { LoggerFactory } from './logging/LoggerFactory.js';
export { StratixLogger } from './logging/StratixLogger.js';
export { ConsoleTransport } from './logging/ConsoleTransport.js';
export { FileTransport } from './logging/FileTransport.js';
export type { FileTransportOptions } from './logging/FileTransportOptions.js';

// Configuration
export { ConfigurationManager } from './configuration/ConfigurationManager.js';
export { YamlConfigurationSource } from './configuration/YamlConfigurationSource.js';
export { EnvironmentConfigurationSource } from './configuration/EnvironmentConfigurationSource.js';

// Errors
export { StratixError } from './errors/StratixError.js';
export { Error } from './errors/Error.js';

// Tokens
export { CORE_TOKENS } from './di/CoreTokens.js';
