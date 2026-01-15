/**
 * Provider for loading and accessing application configuration.
 * Implementations can load from files, environment variables, remote sources, etc.
 *
 * @category Configuration
 */
export interface ConfigurationProvider {
  /**
   * Load configuration from source
   */
  load(): Promise<void>;

  /**
   * Get configuration value by key path (dot notation)
   * @example get('database.host') → 'localhost'
   */
  get<T = unknown>(key: string): T | undefined;

  /**
   * Get configuration value with default
   */
  get<T = unknown>(key: string, defaultValue: T): T;

  /**
   * Check if key exists
   */
  has(key: string): boolean;

  /**
   * Get all configuration as object
   */
  getAll(): Record<string, unknown>;

  /**
   * Get configuration for a specific section
   * @example getSection('database') → { host: 'localhost', port: 5432 }
   */
  getSection<T = Record<string, unknown>>(section: string): T | undefined;
}
