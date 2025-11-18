import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';
import type { GeneratedFile } from '../types/index.js';
import { generateEventHandler } from './templates/event-handler-template.js';

export interface EventHandlerGeneratorOptions {
  eventName: string;
  handlerName?: string;
  projectRoot?: string;
}

export class EventHandlerGenerator extends BaseGenerator {
  constructor(private options: EventHandlerGeneratorOptions) {
    super(options.projectRoot);
  }

  async generate(): Promise<GeneratedFile[]> {
    const { eventName, handlerName } = this.options;
    const eventPascal = this.naming.toPascalCase(eventName);
    const handlerPascal = handlerName
      ? this.naming.toPascalCase(handlerName)
      : `${eventPascal}Handler`;

    await Promise.resolve();

    return [
      {
        path: path.join(
          this.projectRoot,
          `src/application/event-handlers/${handlerPascal}.ts`
        ),
        content: generateEventHandler(eventPascal, handlerPascal),
        action: 'create',
      },
    ];
  }
}
