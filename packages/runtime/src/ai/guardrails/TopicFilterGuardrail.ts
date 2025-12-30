import {
  Guardrail,
  type GuardrailContext,
  type GuardrailResult,
  GuardrailSeverity,
} from '@stratix/core';

/**
 * Configuration for topic filtering
 */
export interface TopicFilterGuardrailConfig {
  /**
   * List of allowed topics
   */
  readonly allowedTopics?: string[];

  /**
   * List of forbidden topics
   */
  readonly forbiddenTopics?: string[];

  /**
   * Keywords for each topic
   */
  readonly topicKeywords?: Record<string, string[]>;

  /**
   * Severity level for topic violations
   */
  readonly severity?: GuardrailSeverity;

  /**
   * Minimum keyword matches to classify a topic
   */
  readonly minKeywordMatches?: number;

  /**
   * Whether to enable this guardrail
   */
  readonly enabled?: boolean;
}

/**
 * Guardrail that filters content based on allowed/forbidden topics.
 *
 * Uses keyword matching to classify content into topics and validates
 * against allowed or forbidden topic lists.
 *
 * @example
 * ```typescript
 * const topicGuardrail = new TopicFilterGuardrail({
 *   allowedTopics: ['support', 'sales', 'billing'],
 *   forbiddenTopics: ['politics', 'religion'],
 *   topicKeywords: {
 *     politics: ['election', 'vote', 'government', 'political'],
 *     support: ['help', 'issue', 'problem', 'fix'],
 *   },
 *   severity: GuardrailSeverity.ERROR,
 * });
 *
 * const result = await topicGuardrail.evaluate({
 *   content: 'What are your thoughts on the recent election?',
 *   contentType: 'input',
 * });
 *
 * console.log(result.passed); // false (politics is forbidden)
 * ```
 */
export class TopicFilterGuardrail extends Guardrail<string> {
  readonly enabled: boolean;

  private readonly allowedTopics: Set<string> | null;
  private readonly forbiddenTopics: Set<string>;
  private readonly topicKeywords: Map<string, string[]>;
  private readonly guardrailSeverity: GuardrailSeverity;
  private readonly minKeywordMatches: number;

  get name(): string {
    return 'topic-filter';
  }

  get severity(): GuardrailSeverity {
    return this.guardrailSeverity;
  }

  get description(): string {
    return 'Filters content based on allowed or forbidden topics';
  }

  // Default topic keywords for common categories
  private readonly defaultTopicKeywords: Record<string, string[]> = {
    politics: [
      'election',
      'vote',
      'government',
      'political',
      'president',
      'congress',
      'senate',
      'democrat',
      'republican',
      'policy',
      'legislation',
    ],
    religion: [
      'god',
      'religion',
      'church',
      'mosque',
      'temple',
      'faith',
      'belief',
      'prayer',
      'religious',
      'spiritual',
    ],
    violence: [
      'kill',
      'murder',
      'weapon',
      'gun',
      'bomb',
      'attack',
      'violence',
      'violent',
      'harm',
      'hurt',
    ],
    adult: [
      'sexual',
      'porn',
      'explicit',
      'nsfw',
      'xxx',
      'adult content',
    ],
    illegal: [
      'illegal',
      'drugs',
      'hack',
      'fraud',
      'scam',
      'steal',
      'crime',
      'criminal',
    ],
    medical: [
      'medical',
      'diagnosis',
      'treatment',
      'medicine',
      'health',
      'disease',
      'symptom',
      'doctor',
    ],
    legal: [
      'legal',
      'law',
      'attorney',
      'lawyer',
      'court',
      'lawsuit',
      'contract',
      'rights',
    ],
    financial: [
      'invest',
      'stock',
      'crypto',
      'trading',
      'financial advice',
      'money',
      'portfolio',
    ],
  };

  constructor(config: TopicFilterGuardrailConfig = {}) {
    super();
    this.allowedTopics = config.allowedTopics
      ? new Set(config.allowedTopics)
      : null;
    this.forbiddenTopics = new Set(config.forbiddenTopics || []);
    this.guardrailSeverity = config.severity || GuardrailSeverity.WARNING;
    this.minKeywordMatches = config.minKeywordMatches || 2;
    this.enabled = config.enabled ?? true;

    // Build topic keywords map
    this.topicKeywords = new Map();

    // Add default keywords for forbidden topics
    for (const topic of this.forbiddenTopics) {
      if (this.defaultTopicKeywords[topic]) {
        this.topicKeywords.set(topic, this.defaultTopicKeywords[topic]);
      }
    }

    // Add custom keywords
    if (config.topicKeywords) {
      for (const [topic, keywords] of Object.entries(config.topicKeywords)) {
        this.topicKeywords.set(topic, keywords);
      }
    }
  }

  check(content: string, _context?: GuardrailContext): Promise<GuardrailResult> {
    const contentLower = content.toLowerCase();
    const detectedTopics = this.detectTopics(contentLower);

    // Check forbidden topics
    const forbiddenDetected = detectedTopics.filter((topic) =>
      this.forbiddenTopics.has(topic)
    );

    if (forbiddenDetected.length > 0) {
      return Promise.resolve(
        this.fail(
          `Content contains forbidden topic(s): ${forbiddenDetected.join(', ')}`,
          {
            forbiddenTopics: forbiddenDetected,
            allDetectedTopics: detectedTopics,
            violations: forbiddenDetected.map((topic) => ({
              type: 'forbidden',
              topic,
            })),
            remediation: `Rephrase content to avoid forbidden topics: ${forbiddenDetected.join(', ')}`,
          }
        )
      );
    }

    // Check allowed topics (if specified)
    if (this.allowedTopics !== null && this.allowedTopics.size > 0) {
      const allowedDetected = detectedTopics.filter((topic) =>
        this.allowedTopics!.has(topic)
      );

      if (allowedDetected.length === 0) {
        return Promise.resolve(
          this.fail(
            'Content does not match any allowed topics',
            {
              allowedTopics: [...this.allowedTopics],
              detectedTopics,
              remediation: `Content must relate to allowed topics: ${[...this.allowedTopics].join(', ')}`,
            }
          )
        );
      }
    }

    const passResult = this.pass(
      detectedTopics.length > 0
        ? `Detected topics: ${detectedTopics.join(', ')}`
        : 'No topics detected'
    );

    return Promise.resolve({
      ...passResult,
      details: {
        detectedTopics,
      },
    });
  }

  /**
   * Detect topics in content based on keyword matching
   */
  private detectTopics(contentLower: string): string[] {
    const detected: string[] = [];

    for (const [topic, keywords] of this.topicKeywords.entries()) {
      let matches = 0;

      for (const keyword of keywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          matches++;
        }
      }

      if (matches >= this.minKeywordMatches) {
        detected.push(topic);
      }
    }

    return detected;
  }
}
