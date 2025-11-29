/**
 * Configuration change event
 */
export interface ConfigChange {
  /**
   * Configuration key that changed
   */
  key: string;

  /**
   * Previous value
   */
  oldValue: unknown;

  /**
   * New value
   */
  newValue: unknown;

  /**
   * Timestamp of the change
   */
  timestamp: Date;
}

/**
 * Configuration Provider Interface
 *
 * Defines the contract for retrieving application configuration
 * from various sources with type safety and validation.
 *
 * @example
 * ```typescript
 * const config = new EnvConfigProvider({ prefix: 'APP_' });
 *
 * const port = await config.getRequired<number>('port');
 * const host = await config.get<string>('host', 'localhost');
 * const dbConfig = await config.getNamespace('database');
 * ```
 */
export interface ConfigProvider {
  /**
   * Get a configuration value with optional type and default
   *
   * @param key - The configuration key (supports dot notation: 'database.url')
   * @param defaultValue - Default value if key is not found
   * @returns The configuration value or default
   *
   * @example
   * ```typescript
   * const port = await config.get<number>('server.port', 3000);
   * const timeout = await config.get<number>('api.timeout', 5000);
   * ```
   */
  get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined>;

  /**
   * Get a required configuration value
   *
   * @param key - The configuration key
   * @throws ConfigNotFoundError if the value is not found
   * @returns The configuration value
   *
   * @example
   * ```typescript
   * const apiKey = await config.getRequired<string>('api.key');
   * ```
   */
  getRequired<T = unknown>(key: string): Promise<T>;

  /**
   * Get all configuration as an object
   *
   * @returns The complete configuration object
   *
   * @example
   * ```typescript
   * const allConfig = await config.getAll<AppConfig>();
   * ```
   */
  getAll<T = Record<string, unknown>>(): Promise<T>;

  /**
   * Get configuration for a specific namespace
   *
   * @param namespace - The namespace key (e.g., 'database', 'server')
   * @returns Configuration object for the namespace
   *
   * @example
   * ```typescript
   * const dbConfig = await config.getNamespace('database');
   * // Returns: { url: '...', poolSize: 10, ... }
   * ```
   */
  getNamespace<T = Record<string, unknown>>(namespace: string): Promise<T>;

  /**
   * Check if a configuration key exists
   *
   * @param key - The configuration key
   * @returns True if the key exists, false otherwise
   *
   * @example
   * ```typescript
   * if (await config.has('features.newUI')) {
   *   // Feature flag exists
   * }
   * ```
   */
  has(key: string): Promise<boolean>;

  /**
   * Reload configuration (if supported by implementation)
   *
   * @example
   * ```typescript
   * await config.reload();
   * console.log('Configuration reloaded');
   * ```
   */
  reload?(): Promise<void>;

  /**
   * Watch for configuration changes (if supported)
   *
   * @param callback - Function called when configuration changes
   * @returns Function to unsubscribe from changes
   *
   * @example
   * ```typescript
   * const unwatch = config.watch?.((changes) => {
   *   for (const change of changes) {
   *     console.log(`${change.key} changed from ${change.oldValue} to ${change.newValue}`);
   *   }
   * });
   *
   * // Later: stop watching
   * unwatch?.();
   * ```
   */
  watch?(callback: (changes: ConfigChange[]) => void): () => void;
}
