const EXT = process.env.NODE_ENV === 'production' ? 'js' : 'ts';

export const DEFAULT_STRATIX_CONFIG = {
  scanDirs: ['src/'],
  ignoreFiles: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.spec.*',
    '**/*.test.*'
  ],
  diMode: 'proxy' as const
};

export const DEFAULT_CONTEXT_INJECTABLE_PATTERNS = [
  // application
  `**/application/**/*Command.${EXT}`,
  `**/application/**/*CommandHandler.${EXT}`,
  `**/application/**/*Query.${EXT}`,
  `**/application/**/*QueryHandler.${EXT}`,
  `**/application/**/*Event.${EXT}`,
  `**/application/**/*EventHandler.${EXT}`,
  `**/application/**/*UseCase.${EXT}`,
  // infrastructure
  `**/infrastructure/**/*Repository.${EXT}`,
  `**/infrastructure/**/*Provider.${EXT}`,
  `**/infrastructure/**/*Client.${EXT}`,
  `**/infrastructure/**/*Adapter.${EXT}`,
  `**/*.factory.${EXT}`,
  // domain
  `**/domain/**/*DomainService.${EXT}`
];
