import { AIAgent, AgentResult, AgentVersionFactory, AgentCapabilities } from '@stratix/core';
import type { AgentCapability, LLMProvider, AgentMessage, ModelConfig } from '@stratix/core';
import type { EntityId, ToolRegistry } from '@stratix/core';
import type { SupportRequest, SupportResponse } from './types.js';

/**
 * Enterprise-grade Customer Support AI Agent
 *
 * This agent demonstrates advanced features:
 * - Tool usage for external integrations
 * - RAG-based knowledge retrieval
 * - Sentiment analysis and escalation
 * - Multi-language support
 * - Structured workflow execution
 */
export class EnterpriseSupportAgent extends AIAgent<SupportRequest, SupportResponse> {
  readonly name = 'Enterprise Support Agent';
  readonly description = 'Advanced AI agent for enterprise customer support with tool integration';
  readonly version = AgentVersionFactory.create('2.0.0');

  readonly capabilities: AgentCapability[] = [
    AgentCapabilities.CUSTOMER_SUPPORT,
    AgentCapabilities.SENTIMENT_ANALYSIS,
    'knowledge_retrieval',
    'ticket_management',
    'order_tracking',
    'multilingual_support',
    'escalation_management',
  ];

  readonly model: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
  };

  constructor(
    id: EntityId<'AIAgent'>,
    createdAt: Date,
    updatedAt: Date,
    private readonly llmProvider: LLMProvider,
    private readonly toolRegistry?: ToolRegistry
  ) {
    super(id, createdAt, updatedAt);
  }

  protected async execute(input: SupportRequest): Promise<AgentResult<SupportResponse>> {
    try {
      const startTime = Date.now();

      // Build context-aware messages
      const messages: AgentMessage[] = this.buildMessages(input);

      // Get tool definitions if available
      const tools = this.toolRegistry ? await this.getToolDefinitions() : undefined;

      // Call LLM with tools enabled
      const llmResponse = await this.llmProvider.chat({
        model: this.model.model,
        messages,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
        tools,
        responseFormat: {
          type: 'json_object',
        },
      });

      // Execute any tool calls requested by the LLM
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        const toolResults = await this.executeTools(llmResponse.toolCalls);

        // Add tool results to conversation and get final response
        messages.push({
          role: 'assistant',
          content: llmResponse.content,
          timestamp: new Date(),
          toolCalls: llmResponse.toolCalls,
        });

        // Add tool results
        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            content: JSON.stringify(result.result),
            timestamp: new Date(),
            toolCallId: result.toolCallId,
          });
        }

        // Get final response after tool execution
        const finalResponse = await this.llmProvider.chat({
          model: this.model.model,
          messages,
          temperature: this.model.temperature,
          maxTokens: this.model.maxTokens,
          responseFormat: {
            type: 'json_object',
          },
        });

        const response = this.parseResponse(finalResponse.content, input);
        const duration = Date.now() - startTime;

        return AgentResult.success(response, {
          model: this.model.model,
          duration,
          totalTokens: llmResponse.usage.totalTokens + finalResponse.usage.totalTokens,
          cost: this.calculateTotalCost(llmResponse.usage, finalResponse.usage),
        });
      }

      // No tools needed, parse direct response
      const response = this.parseResponse(llmResponse.content, input);
      const duration = Date.now() - startTime;

      return AgentResult.success(response, {
        model: this.model.model,
        duration,
        totalTokens: llmResponse.usage.totalTokens,
        cost: this.calculateCost(llmResponse.usage),
      });
    } catch (error) {
      return AgentResult.failure(error as Error, {
        model: this.model.model,
        stage: 'execution',
      });
    }
  }

  private buildMessages(input: SupportRequest): AgentMessage[] {
    const messages: AgentMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
        timestamp: new Date(),
      },
    ];

    // Add conversation history if present
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      for (const msg of input.conversationHistory) {
        messages.push({
          role: msg.role === 'customer' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
        });
      }
    }

    // Add current request
    messages.push({
      role: 'user',
      content: this.buildUserPrompt(input),
      timestamp: new Date(),
    });

    return messages;
  }

  private buildSystemPrompt(): string {
    return `You are an expert enterprise customer support agent with access to company systems and knowledge base.

Your capabilities include:
- Searching the knowledge base for solutions (use query_knowledge_base tool)
- Checking order status and details (use check_order_status tool)
- Creating and managing support tickets (use create_support_ticket tool)
- Analyzing customer sentiment
- Providing multilingual support
- Intelligent escalation to human agents

Response Format:
Your response MUST be valid JSON with this structure:
{
  "message": "Your response to the customer",
  "sentiment": {
    "score": number (-1 to 1, where -1 is very negative, 1 is very positive),
    "label": "positive" | "neutral" | "negative"
  },
  "category": "billing" | "technical" | "shipping" | "product" | "account" | "general",
  "priority": "low" | "medium" | "high" | "critical",
  "requiresEscalation": boolean,
  "suggestedActions": ["action1", "action2"],
  "confidence": number (0-1),
  "language": "en" | "es" | "fr" | "de" (detected language),
  "metadata": {
    "ticketId": string (if ticket created),
    "orderId": string (if order referenced),
    "knowledgeArticles": string[] (IDs of referenced articles)
  }
}

Guidelines:
1. Always be professional, empathetic, and solution-oriented
2. Use tools proactively to gather information
3. Analyze sentiment to detect frustration or urgency
4. Set appropriate priority based on issue severity and sentiment
5. Escalate if: sentiment is very negative, issue is complex, customer explicitly requests it, or multiple failed attempts
6. Provide clear, actionable next steps
7. Reference knowledge base articles when available
8. Support multiple languages automatically

Priority Guidelines:
- critical: System down, data loss, security issues, extremely negative sentiment
- high: Service disruption, payment issues, angry customers
- medium: Feature requests, minor bugs, general questions with neutral sentiment
- low: Information requests, positive feedback`;
  }

  private buildUserPrompt(input: SupportRequest): string {
    let prompt = `Customer ID: ${input.customerId}\n`;
    prompt += `Request: ${input.message}\n`;

    if (input.metadata) {
      if (input.metadata.orderId) {
        prompt += `Order ID: ${input.metadata.orderId}\n`;
      }
      if (input.metadata.accountAge) {
        prompt += `Account Age: ${input.metadata.accountAge} days\n`;
      }
      if (input.metadata.previousTickets !== undefined) {
        prompt += `Previous Tickets: ${input.metadata.previousTickets}\n`;
      }
      if (input.metadata.customerTier) {
        prompt += `Customer Tier: ${input.metadata.customerTier}\n`;
      }
    }

    if (input.attachments && input.attachments.length > 0) {
      prompt += `\nAttachments: ${input.attachments.map(a => `${a.name} (${a.type})`).join(', ')}\n`;
    }

    return prompt;
  }

  private async getToolDefinitions() {
    if (!this.toolRegistry) return undefined;

    const tools = await this.toolRegistry.listTools();
    return tools.map(tool => tool.definition);
  }

  private async executeTools(toolCalls: Array<{ id: string; name: string; arguments: string }>) {
    if (!this.toolRegistry) return [];

    const results = [];
    for (const call of toolCalls) {
      try {
        const tool = await this.toolRegistry.getTool(call.name);
        if (tool) {
          const args = JSON.parse(call.arguments);
          const result = await tool.execute(args);
          results.push({
            toolCallId: call.id,
            result,
          });
        }
      } catch (error) {
        results.push({
          toolCallId: call.id,
          result: { error: (error as Error).message },
        });
      }
    }

    return results;
  }

  private parseResponse(content: string, input: SupportRequest): SupportResponse {
    const parsed = JSON.parse(content);

    return {
      message: parsed.message,
      sentiment: parsed.sentiment,
      category: parsed.category,
      priority: parsed.priority,
      requiresEscalation: parsed.requiresEscalation,
      suggestedActions: parsed.suggestedActions || [],
      confidence: parsed.confidence,
      language: parsed.language || 'en',
      metadata: parsed.metadata || {},
      timestamp: new Date(),
    };
  }

  private calculateCost(usage: { inputTokens: number; outputTokens: number; totalTokens: number }): number {
    if ('calculateCost' in this.llmProvider && typeof this.llmProvider.calculateCost === 'function') {
      return this.llmProvider.calculateCost(this.model.model, usage);
    }
    return 0;
  }

  private calculateTotalCost(
    usage1: { inputTokens: number; outputTokens: number; totalTokens: number },
    usage2: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): number {
    if ('calculateCost' in this.llmProvider && typeof this.llmProvider.calculateCost === 'function') {
      const cost1 = this.llmProvider.calculateCost(this.model.model, usage1);
      const cost2 = this.llmProvider.calculateCost(this.model.model, usage2);
      return cost1 + cost2;
    }
    return 0;
  }
}
