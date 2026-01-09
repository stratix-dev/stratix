import { Result } from '../../result/Result.js';

/**
 * Schema for validating configuration structure
 *
 * @category Configuration
 */
export interface ConfigurationSchema {
  /**
   * Validate configuration object
   * @returns Result with validated config or error
   */
  validate(config: Record<string, unknown>): Result<Record<string, unknown>, Error>;
}
