/**
 * Secrets Provider Interface
 * 
 * Defines the contract for retrieving secrets from a secure storage.
 * @category Infrastructure
 */
export interface SecretsProvider {
    /**
     * Get a secret value
     * @param key The key of the secret to retrieve
     * @returns The secret value or undefined if not found
     */
    get(key: string): Promise<string | undefined>;

    /**
     * Get a required secret value
     * @param key The key of the secret to retrieve
     * @throws Error if the secret is not found
     * @returns The secret value
     */
    getRequired(key: string): Promise<string>;

    /**
     * Check if a secret exists
     * @param key The key of the secret to check
     * @returns True if the secret exists, false otherwise
     */
    has(key: string): Promise<boolean>;
}
