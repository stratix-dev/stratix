export const STRATIX_METADATA = Symbol.for('stratix:metadata');

export const METADATA_KEYS = {
  APP: Symbol.for('stratix:app'),
  CONTEXT: Symbol.for('stratix:context'),
  COMMAND_HANDLER: Symbol.for('stratix:command_handler')
} as const;
