/**
 * Configuration for automatic sanitization of sensitive data
 */
export interface SanitizeConfig {
  /**
   * Enable sanitization
   * @default true in production, false in development
   */
  enabled?: boolean;

  /**
   * Patterns to match sensitive keys
   * @default ['password', 'token', 'secret', 'apiKey']
   */
  patterns?: Array<string | RegExp>;

  /**
   * Replacement text for sanitized values
   * @default '[REDACTED]'
   */
  replacement?: string;

  /**
   * Custom sanitizer function
   *
   * @param key - Metadata key
   * @param value - Metadata value
   * @returns Sanitized value
   */
  customSanitizer?: (key: string, value: unknown) => unknown;
}
