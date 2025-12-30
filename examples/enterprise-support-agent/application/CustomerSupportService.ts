import { AgentService, Result, Success, Failure } from '@stratix/core';
import type { LLMPort, LLMRequest, LLMCompletionResponse, AgentSpecification } from '@stratix/core';
import type { CustomerSupportAgentSpec } from '../domain/CustomerSupportAgentSpec.js';

/**
 * Input for customer support queries.
 */
export interface SupportQuery {
  /**
   * Customer's question or issue.
   */
  readonly query: string;

  /**
   * Optional conversation history.
   */
  readonly previousMessages?: readonly string[];

  /**
   * Customer metadata.
   */
  readonly customerId?: string;
  readonly customerEmail?: string;
}

/**
 * Output from customer support agent.
 */
export interface SupportResponse {
  /**
   * Generated response to customer.
   */
  readonly response: string;

  /**
   * Whether this query should be escalated.
   */
  readonly shouldEscalate: boolean;

  /**
   * Priority level.
   */
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';

  /**
   * Suggested follow-up actions.
   */
  readonly followUpActions?: readonly string[];
}

/**
 * Customer Support Service (Application Layer).
 *
 * This service orchestrates the customer support flow:
 * - Validates input using domain rules
 * - Prepares LLM requests using domain logic
 * - Executes LLM calls via infrastructure (LLMPort)
 * - Parses responses and applies domain logic
 *
 * This is where domain meets infrastructure, keeping domain pure.
 *
 * @example
 * ```typescript
 * // application/bootstrap.ts
 * const llmPort = new OpenAILLMAdapter(apiKey);
 * const service = new CustomerSupportService(llmPort);
 *
 * // application/handlers/HandleSupportQuery.ts
 * const result = await service.execute(agentSpec, {
 *   query: 'How do I reset my password?',
 *   customerId: 'user-123'
 * });
 *
 * if (result.isSuccess) {
 *   const { response, shouldEscalate, priority } = result.value.output;
 *   // Handle response...
 * }
 * ```
 */
export class CustomerSupportService extends AgentService<SupportQuery, SupportResponse> {
  /**
   * Create customer support service.
   *
   * @param llmPort - LLM port for making completions (infrastructure)
   */
  constructor(llmPort: LLMPort) {
    super(llmPort);
  }

  /**
   * Validate input before execution.
   * Uses domain logic from AgentSpecification.
   */
  protected async validate(
    spec: AgentSpecification,
    input: SupportQuery
  ): Promise<Result<void, Error>> {
    // Cast to specific spec type for domain methods
    const supportSpec = spec as CustomerSupportAgentSpec;

    // Use domain rule to validate
    if (!supportSpec.canHandleQuery(input.query)) {
      return Failure.create(
        new Error('Query cannot be handled: invalid or too long')
      );
    }

    return Success.create(undefined);
  }

  /**
   * Prepare LLM request using domain logic.
   */
  protected prepareRequest(
    spec: AgentSpecification,
    input: SupportQuery
  ): LLMRequest {
    const supportSpec = spec as CustomerSupportAgentSpec;

    // Use domain logic to build messages
    const messages = supportSpec.buildMessages(input.query, {
      previousMessages: input.previousMessages as string[] | undefined,
    });

    return {
      messages,
      config: spec.modelConfig,
      user: input.customerId,
    };
  }

  /**
   * Parse LLM response into domain model.
   */
  protected parseResponse(
    response: LLMCompletionResponse,
    spec: AgentSpecification
  ): SupportResponse {
    const supportSpec = spec as CustomerSupportAgentSpec;

    // Extract response text
    const responseText = response.content;

    // Apply domain rules
    const shouldEscalate = supportSpec.requiresEscalation(responseText);
    const priority = supportSpec.assessPriority(responseText);

    // Build follow-up actions based on domain logic
    const followUpActions: string[] = [];

    if (shouldEscalate) {
      followUpActions.push('Create escalation ticket');
      followUpActions.push('Notify support manager');
    }

    if (priority === 'urgent') {
      followUpActions.push('Send immediate notification');
    }

    return {
      response: responseText,
      shouldEscalate,
      priority,
      followUpActions: followUpActions.length > 0 ? followUpActions : undefined,
    };
  }

  /**
   * Estimate cost using provider-specific pricing.
   */
  protected estimateCost(
    response: LLMCompletionResponse,
    spec: AgentSpecification
  ): number {
    // OpenAI GPT-4o pricing
    const inputCostPer1M = 2.5; // $2.50 per 1M input tokens
    const outputCostPer1M = 10.0; // $10.00 per 1M output tokens

    const inputCost = (response.usage.promptTokens / 1_000_000) * inputCostPer1M;
    const outputCost = (response.usage.completionTokens / 1_000_000) * outputCostPer1M;

    return inputCost + outputCost;
  }
}
