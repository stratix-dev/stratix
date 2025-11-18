export function generateEventHandler(
  eventName: string,
  handlerName: string
): string {
  return `import type { DomainEventHandler } from '@stratix/abstractions';
import type { ${eventName} } from '../../domain/events/${eventName}.js';

export class ${handlerName} implements DomainEventHandler<${eventName}> {
  constructor() {}

  async handle(event: ${eventName}): Promise<void> {
    console.log(\`Handling \${event.eventName} event:\`, event.payload);
    
    // TODO: Implement your business logic here
    // Examples:
    // - Send notification
    // - Update read model
    // - Trigger another process
    // - Log analytics
  }

  get eventName(): string {
    return '${eventName}';
  }
}
`;
}
