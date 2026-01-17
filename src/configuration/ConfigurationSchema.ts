import { Result } from '../result/Result.js';

export interface ConfigurationSchema {
  validate(config: Record<string, unknown>): Result<Record<string, unknown>, Error>;
}
