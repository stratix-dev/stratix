import { AgentSpecification, EntityId } from '@stratix/core';
import type { AgentSpecificationId, AgentMetadata, ModelConfig } from '@stratix/core';

/**
 * Customer Support Agent Specification (Domain Entity).
 *
 * This is a PURE DOMAIN entity with NO I/O operations.
 * It contains only:
 * - Configuration and metadata
 * - Business rules and validation logic
 * - Domain-level prompt building
 *
 * Use this pattern when following strict hexagonal architecture.
 *
 * @example
 * ```typescript
 * // In domain layer - no infrastructure dependencies
 * const spec = new CustomerSupportAgentSpec(EntityId.create());
 *
 * // Domain logic - no I/O
 * const canHandle = spec.canHandleQuery(query);
 * const messages = spec.buildMessages(query);
 * ```
 */
export class CustomerSupportAgentSpec extends AgentSpecification {
  constructor(id: AgentSpecificationId) {
    const metadata: AgentMetadata = {
      name: 'Customer Support Agent',
      description: 'Handles customer support inquiries with empathy and accuracy',
      version: '2.0.0',
      capabilities: [
        'customer-support',
        'sentiment-analysis',
        'knowledge-retrieval',
        'ticket-management',
      ],
      tags: ['support', 'customer-service', 'ddd-example'],
    };

    const modelConfig: ModelConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
    };

    super(id, metadata, modelConfig);
  }

  /**
   * Domain rule: Check if query can be handled by this agent.
   * Pure business logic - no I/O.
   */
  canHandleQuery(query: string): boolean {
    // Business rules
    if (!query || query.trim().length === 0) {
      return false;
    }

    if (query.length > 5000) {
      return false; // Too long
    }

    // Could add more domain rules here:
    // - Language detection
    // - Topic classification
    // - Priority assessment

    return true;
  }

  /**
   * Domain logic: Build conversation messages.
   * Pure function - no side effects.
   */
  buildMessages(query: string, context?: { previousMessages?: string[] }): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // System message with business rules encoded
    messages.push({
      role: 'system',
      content: this.buildSystemPrompt(),
    });

    // Previous conversation history (if any)
    if (context?.previousMessages) {
      for (const msg of context.previousMessages) {
        messages.push({
          role: 'assistant',
          content: msg,
        });
      }
    }

    // Current user query
    messages.push({
      role: 'user',
      content: this.buildUserPrompt(query),
    });

    return messages;
  }

  /**
   * Domain knowledge: Build system prompt.
   * Encodes business rules and domain knowledge.
   */
  private buildSystemPrompt(): string {
    return `You are a professional customer support agent for an enterprise company.

Your responsibilities:
- Provide accurate, helpful responses to customer inquiries
- Maintain a friendly, empathetic tone
- Escalate complex issues when appropriate
- Follow company policies and guidelines

Guidelines:
- Always be respectful and professional
- Ask clarifying questions when needed
- Provide step-by-step instructions when applicable
- Acknowledge customer frustrations with empathy

Capabilities: ${this.capabilities.join(', ')}`;
  }

  /**
   * Domain logic: Build user prompt.
   */
  private buildUserPrompt(query: string): string {
    return `Customer Query: ${query}

Please provide a helpful, accurate response following the guidelines above.`;
  }

  /**
   * Domain rule: Determine if query requires escalation.
   * Pure business logic.
   */
  requiresEscalation(query: string): boolean {
    const escalationKeywords = [
      'refund',
      'legal',
      'lawyer',
      'sue',
      'complaint',
      'manager',
      'supervisor',
    ];

    const lowerQuery = query.toLowerCase();
    return escalationKeywords.some((keyword) => lowerQuery.includes(keyword));
  }

  /**
   * Domain rule: Assess query priority.
   */
  assessPriority(query: string): 'low' | 'medium' | 'high' | 'urgent' {
    const urgentKeywords = ['emergency', 'urgent', 'critical', 'immediately'];
    const highKeywords = ['problem', 'issue', 'not working', 'broken'];

    const lowerQuery = query.toLowerCase();

    if (urgentKeywords.some((kw) => lowerQuery.includes(kw))) {
      return 'urgent';
    }

    if (highKeywords.some((kw) => lowerQuery.includes(kw))) {
      return 'high';
    }

    if (this.requiresEscalation(query)) {
      return 'high';
    }

    return 'medium';
  }
}
