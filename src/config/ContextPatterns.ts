const EXT = process.env.NODE_ENV === 'production' ? 'js' : 'ts';

export const DEFAULT_CONTEXT_PATTERNS = [
  // app
  `**/*Controller.${EXT}`,
  `**/*Middleware.${EXT}`,
  `**/*Listener.${EXT}`,
  `**/*Scheduler.${EXT}`,

  // application
  `**/application/**/*Command.${EXT}`,
  `**/application/**/*CommandHandler.${EXT}`,
  `**/application/**/*Query.${EXT}`,
  `**/application/**/*QueryHandler.${EXT}`,
  `**/application/**/*Event.${EXT}`,
  `**/application/**/*EventHandler.${EXT}`,
  `**/application/**/*UseCase.${EXT}`,
  // infrastructure
  `**/infrastructure/**/*Service.${EXT}`,
  `**/infrastructure/**/*Repository.${EXT}`,
  `**/infrastructure/**/*Provider.${EXT}`,
  `**/infrastructure/**/*Client.${EXT}`,
  `**/infrastructure/**/*Adapter.${EXT}`,

  // domain
  `**/domain/**/*DomainService.${EXT}`,
  `**/domain/**/*Repository.${EXT}`,
  `**/domain/**/*Specification.${EXT}`,
  `**/domain/**/*Factory.${EXT}`,
  `**/domain/**/*Entity.${EXT}`,
  `**/domain/**/*ValueObject.${EXT}`,
  `**/domain/**/*Aggregate.${EXT}`
];
