import { ContextMetadata } from './ContextMetadata.js';
import { ContextConfig } from './ContextConfig.js';
import {
  ContextCommandDefinition,
  ContextQueryDefinition,
  ContextEventHandlerDefinition,
  ContextRepositoryDefinition
} from './definitions.js';

export interface Context {
  readonly metadata: ContextMetadata;
  readonly name: string;
  getCommands?(): ContextCommandDefinition[];
  getQueries?(): ContextQueryDefinition[];
  getEventHandlers?(): ContextEventHandlerDefinition[];
  getRepositories?(): ContextRepositoryDefinition[];
  initialize?(config: ContextConfig): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}
