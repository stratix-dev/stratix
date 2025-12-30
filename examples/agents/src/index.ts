import { ApplicationBuilder, ConsoleLogger, createContainer } from '@stratix/runtime';
import { LogLevel } from '@stratix/core';

const container = createContainer();
const logger = new ConsoleLogger({ level: 'info' as LogLevel });

const app = await ApplicationBuilder.create()
  .useContainer(container)
  .useLogger(logger)
  .build();

await app.start();

logger.info('🚀 Application started successfully!');
