export type MetadataKey<K extends string> = symbol & { readonly __metadataKey: K };

export function defineMetadataKey<K extends string>(key: K): MetadataKey<K> {
  return Symbol.for(`stratix:metadata:${key}`) as MetadataKey<K>;
}

// Built-in keys
export const MetadataKeys = {
  App: defineMetadataKey('app'),
  Context: defineMetadataKey('context'),
  CommandHandler: defineMetadataKey('command-handler'),
  QueryHandler: defineMetadataKey('query-handler'),
  EventHandler: defineMetadataKey('event-handler'),
  Injectable: defineMetadataKey('injectable'),
  Module: defineMetadataKey('module')
} as const;
