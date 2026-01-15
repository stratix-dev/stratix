/**
 * Semantic version for an AI agent.
 *
 * @example
 * ```typescript
 * const version = AgentVersion.parse('1.2.3');
 * console.log(version.major); // 1
 * console.log(version.minor); // 2
 * console.log(version.patch); // 3
 * console.log(version.toString()); // "1.2.3"
 * ```
 */
export class AgentVersion {
  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number
  ) {}

  /**
   * Parse a version string.
   *
   * @param version - Version string in format "major.minor.patch"
   * @returns AgentVersion instance
   * @throws {Error} If version string is invalid
   */
  static parse(version: string): AgentVersion {
    const parts = version.split('.');
    if (parts.length !== 3) {
      throw new Error(
        `Invalid version format: "${version}". Expected format: "major.minor.patch"`
      );
    }

    const [major, minor, patch] = parts.map(Number);

    if ([major, minor, patch].some(isNaN)) {
      throw new Error(`Invalid version numbers in: "${version}"`);
    }

    if ([major, minor, patch].some((n) => n < 0)) {
      throw new Error(`Version numbers must be non-negative: "${version}"`);
    }

    return new AgentVersion(major, minor, patch);
  }

  /**
   * Create a version from components.
   *
   * @param major - Major version number
   * @param minor - Minor version number
   * @param patch - Patch version number
   * @returns AgentVersion instance
   */
  static create(major: number, minor: number, patch: number): AgentVersion {
    if ([major, minor, patch].some((n) => n < 0 || !Number.isInteger(n))) {
      throw new Error('Version numbers must be non-negative integers');
    }
    return new AgentVersion(major, minor, patch);
  }

  /**
   * Convert to string representation.
   *
   * @returns Version string "major.minor.patch"
   */
  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  /**
   * Check if this version is compatible with another version.
   * Compatible if major versions match.
   *
   * @param other - Version to compare with
   * @returns true if compatible
   */
  isCompatibleWith(other: AgentVersion): boolean {
    return this.major === other.major;
  }

  /**
   * Compare with another version.
   *
   * @param other - Version to compare with
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  compare(other: AgentVersion): -1 | 0 | 1 {
    if (this.major !== other.major) {
      return this.major < other.major ? -1 : 1;
    }
    if (this.minor !== other.minor) {
      return this.minor < other.minor ? -1 : 1;
    }
    if (this.patch !== other.patch) {
      return this.patch < other.patch ? -1 : 1;
    }
    return 0;
  }

  /**
   * Check if equal to another version.
   *
   * @param other - Version to compare with
   * @returns true if versions are equal
   */
  equals(other: AgentVersion): boolean {
    return this.compare(other) === 0;
  }
}

/**
 * Capability identifier for an agent.
 *
 * Capabilities describe what an agent can do.
 * Can use predefined constants or custom strings.
 */
export type AgentCapability = string;

/**
 * Predefined agent capabilities.
 * Use these constants for common capabilities.
 */
export const AgentCapabilities = {
  CUSTOMER_SUPPORT: 'customer_support',
  DATA_ANALYSIS: 'data_analysis',
  KNOWLEDGE_RETRIEVAL: 'knowledge_retrieval',
  SENTIMENT_ANALYSIS: 'sentiment_analysis',
  SQL_GENERATION: 'sql_generation',
  CODE_GENERATION: 'code_generation',
  CONTENT_CREATION: 'content_creation',
  DECISION_SUPPORT: 'decision_support',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization',
} as const;

/**
 * Metadata describing an AI agent.
 *
 * Contains descriptive information about an agent that doesn't
 * change during execution.
 *
 * @example
 * ```typescript
 * const metadata = AgentMetadata.create({
 *   name: 'Customer Support Agent',
 *   description: 'Handles customer support tickets and inquiries',
 *   version: '1.0.0',
 *   capabilities: [AgentCapabilities.CUSTOMER_SUPPORT, AgentCapabilities.SENTIMENT_ANALYSIS],
 *   tags: ['support', 'customer-service']
 * });
 * ```
 */
export class AgentMetadata {
  private constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly version: AgentVersion,
    public readonly capabilities: readonly AgentCapability[],
    public readonly tags: readonly string[]
  ) {}

  /**
   * Create agent metadata.
   *
   * @param options - Metadata options
   * @returns AgentMetadata instance
   */
  static create(options: {
    name: string;
    description: string;
    version: string;
    capabilities: AgentCapability[];
    tags?: string[];
  }): AgentMetadata {
    if (!options.name || options.name.trim().length === 0) {
      throw new Error('Agent name cannot be empty');
    }

    if (!options.description || options.description.trim().length === 0) {
      throw new Error('Agent description cannot be empty');
    }

    if (options.capabilities.length === 0) {
      throw new Error('Agent must have at least one capability');
    }

    return new AgentMetadata(
      options.name.trim(),
      options.description.trim(),
      AgentVersion.parse(options.version),
      Object.freeze(options.capabilities),
      Object.freeze(options.tags ?? [])
    );
  }

  /**
   * Check if agent has a specific capability.
   *
   * @param capability - Capability to check
   * @returns true if agent has capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if agent has all of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has all capabilities
   */
  hasCapabilities(capabilities: readonly AgentCapability[]): boolean {
    return capabilities.every((cap) => this.hasCapability(cap));
  }

  /**
   * Check if agent has any of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has at least one capability
   */
  hasAnyCapability(capabilities: readonly AgentCapability[]): boolean {
    return capabilities.some((cap) => this.hasCapability(cap));
  }

  /**
   * Check if agent has a specific tag.
   *
   * @param tag - Tag to check
   * @returns true if agent has tag
   */
  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Convert to plain object for serialization.
   *
   * @returns Plain object representation
   */
  toJSON(): object {
    return {
      name: this.name,
      description: this.description,
      version: this.version.toString(),
      capabilities: this.capabilities,
      tags: this.tags,
    };
  }
}
