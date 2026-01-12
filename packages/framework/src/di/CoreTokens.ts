export const CORE_TOKENS = {
  LOGGER: Symbol.for('stratix:core:logger'),
  LOGGER_FACTORY: Symbol.for('stratix:core:loggerFactory'),
  COMMAND_BUS: Symbol.for('stratix:core:commandBus'),
  QUERY_BUS: Symbol.for('stratix:core:queryBus'),
  EVENT_BUS: Symbol.for('stratix:core:eventBus'),
  CONFIGURATION: Symbol.for('stratix:core:configuration')
} as const;

export type CoreToken = (typeof CORE_TOKENS)[keyof typeof CORE_TOKENS];
