/**
 * Source for loading raw configuration data.
 *
 * @category Configuration
 */
export interface ConfigurationSource {
  /**
   * Unique name for this source
   */
  readonly name: string;

  /**
   * Load configuration data from source
   * @returns Raw configuration object
   */
  load(): Promise<Record<string, unknown>>;

  /**
   * Check if source is available
   */
  isAvailable(): Promise<boolean>;
}
