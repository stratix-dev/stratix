import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';
import type { GeneratedFile } from '../types/index.js';
import { generateEventHandler } from './templates/event-handler-template.js';

export interface EventHandlerGeneratorOptions {
  eventName: string;
  handlerName?: string;
  context?: string;
  projectRoot?: string;
}

export class EventHandlerGenerator extends BaseGenerator {
  constructor(private options: EventHandlerGeneratorOptions) {
    super(options.projectRoot);
  }

  async generate(): Promise<GeneratedFile[]> {
    const { eventName, handlerName, context } = this.options;
    const eventPascal = this.naming.toPascalCase(eventName);
    const handlerPascal = handlerName
      ? this.naming.toPascalCase(handlerName)
      : `${eventPascal}Handler`;

    const structure = await this.detectProjectStructure();

    let handlerPath: string;
    if (context) {
      // Generate inside bounded context
      const contextPath = structure.contextsPath 
        ? path.join(structure.contextsPath, this.naming.toKebabCase(context))
        : path.join(structure.sourceRoot, 'contexts', this.naming.toKebabCase(context));
      handlerPath = path.join(contextPath, 'application', 'event-handlers');
    } else {
      // Generate in global application
      handlerPath = structure.applicationPath
        ? path.join(structure.applicationPath, 'event-handlers')
        : path.join(structure.sourceRoot, 'application', 'event-handlers');
    }

    return [
      {
        path: path.join(handlerPath, `${handlerPascal}.ts`),
        content: generateEventHandler(eventPascal, handlerPascal),
        action: 'create',
      },
    ];
  }
}
