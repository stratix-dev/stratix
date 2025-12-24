import { AIAgent } from '@stratix/core';
import { AgentResult } from '@stratix/core';
import { AgentVersionFactory, AgentCapabilities } from '@stratix/core';
import type { AgentCapability, LLMProvider, AgentMessage } from '@stratix/core';
import type { EntityId } from '@stratix/core';

// ModelConfig is not exported from index, import from types directly
interface ModelConfig {
  readonly provider: string;
  readonly model: string;
  readonly temperature: number;
  readonly maxTokens: number;
}

export interface CustomerInquiry {
  customerId: string;
  inquiryText: string;
  category?: 'billing' | 'technical' | 'general' | 'complaint';
  previousContext?: string[];
}

export interface SupportResponse {
  responseText: string;
  suggestedActions: string[];
  escalationRequired: boolean;
  confidence: number;
  category: 'billing' | 'technical' | 'general' | 'complaint';
}

/**
 * Customer Support AI Agent
 * Handles customer inquiries with context-aware responses
 */
export class CustomerSupportAgent extends AIAgent<CustomerInquiry, SupportResponse> {
  readonly name = 'Customer Support Agent';
  readonly description = 'Handles customer support inquiries with intelligent routing and escalation';
  readonly version = AgentVersionFactory.create('1.0.0');
  readonly capabilities: AgentCapability[] = [
    AgentCapabilities.CUSTOMER_SUPPORT,
    AgentCapabilities.SENTIMENT_ANALYSIS,
    'ticket_creation',
    'knowledge_base_search',
  ];
  readonly model: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency with JSON support
    temperature: 0.7,
    maxTokens: 1000,
  };

  constructor(
    id: EntityId<'AIAgent'>,
    createdAt: Date,
    updatedAt: Date,
    private readonly llmProvider: LLMProvider,
    private readonly systemInstructions?: string
  ) {
    super(id, createdAt, updatedAt);
  }

  /**
   * Execute the agent to process a customer inquiry
   */
  protected async execute(input: CustomerInquiry): Promise<AgentResult<SupportResponse>> {
    try {
      const startTime = Date.now();

      // Build messages for LLM
      const messages: AgentMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
          timestamp: new Date(),
        },
        {
          role: 'user',
          content: this.buildUserPrompt(input),
          timestamp: new Date(),
        },
      ];

      // Call LLM provider
      const llmResponse = await this.llmProvider.chat({
        model: this.model.model,
        messages,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
        responseFormat: {
          type: 'json_object',
        },
      });

      // Parse the JSON response
      const parsedResponse = JSON.parse(llmResponse.content) as {
        responseText: string;
        category: 'billing' | 'technical' | 'general' | 'complaint';
        escalationRequired: boolean;
        suggestedActions: string[];
        confidence: number;
      };

      const response: SupportResponse = {
        responseText: parsedResponse.responseText,
        suggestedActions: parsedResponse.suggestedActions,
        escalationRequired: parsedResponse.escalationRequired,
        confidence: parsedResponse.confidence,
        category: parsedResponse.category,
      };

      const duration = Date.now() - startTime;

      // Calculate cost using provider's method if available
      const cost =
        'calculateCost' in this.llmProvider &&
        typeof this.llmProvider.calculateCost === 'function'
          ? this.llmProvider.calculateCost(this.model.model, llmResponse.usage)
          : 0;

      return AgentResult.success(response, {
        model: this.model.model,
        duration,
        totalTokens: llmResponse.usage.totalTokens,
        cost,
      });
    } catch (error) {
      return AgentResult.failure(error as Error, {
        model: this.model.model,
        stage: 'execution',
      });
    }
  }

  /**
   * Build system prompt with instructions for the LLM
   */
  private buildSystemPrompt(): string {
    return (
      this.systemInstructions ||
      `You are a professional customer support agent. Analyze customer inquiries and provide helpful responses.

Your response MUST be valid JSON with the following structure:
{
  "responseText": "Your empathetic and helpful response to the customer",
  "category": "billing" | "technical" | "general" | "complaint",
  "escalationRequired": boolean,
  "suggestedActions": ["action1", "action2", "action3"],
  "confidence": number between 0 and 1
}

Guidelines:
- Always be polite and professional
- Show empathy for customer frustrations
- Provide clear and actionable next steps
- Set escalationRequired to true for complaints, urgent issues, or complex problems
- Choose the most appropriate category based on the inquiry content
- Confidence should reflect how certain you are about your response (0.0 to 1.0)
- Provide 2-4 suggested actions the customer can take

Category Guidelines:
- billing: Payment issues, charges, refunds, invoices
- technical: Bugs, errors, crashes, technical problems
- complaint: Complaints, dissatisfaction, negative feedback
- general: Questions, information requests, general help

Escalation Triggers:
- Customer explicitly mentions urgency (urgent, emergency, immediately, ASAP)
- Complaint or negative sentiment
- Multiple previous failed attempts mentioned
- Complex issues requiring specialist knowledge`
    );
  }

  /**
   * Build user prompt with inquiry details
   */
  private buildUserPrompt(input: CustomerInquiry): string {
    let prompt = `Customer ID: ${input.customerId}\n`;
    prompt += `Inquiry: ${input.inquiryText}\n`;

    if (input.category) {
      prompt += `Suggested Category: ${input.category}\n`;
    }

    if (input.previousContext && input.previousContext.length > 0) {
      prompt += `\nPrevious Context:\n`;
      input.previousContext.forEach((ctx, idx) => {
        prompt += `${idx + 1}. ${ctx}\n`;
      });
    }

    return prompt;
  }

  /**
   * Get the system instructions for the agent
   * This method provides backward compatibility and can be used for debugging
   */
  getSystemInstructions(): string {
    return this.buildSystemPrompt();
  }
}
