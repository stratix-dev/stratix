export interface EnvironmentSourceOptions {
  /**
   * Prefix for environment variables
   * @example 'APP_' → APP_DATABASE_HOST
   */
  prefix?: string;

  /**
   * Separator for nested keys
   * @default '__'
   * @example APP_DATABASE__HOST → database.host
   */
  separator?: string;

  /**
   * Convert keys to lowercase
   * @default true
   */
  lowercase?: boolean;
}
