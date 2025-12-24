import type { Context, ContextMetadata, ContextCommandDefinition, ContextQueryDefinition, LLMProvider } from '@stratix/core';
import { EntityId, InMemoryToolRegistry } from '@stratix/core';
import { EnterpriseSupportAgent } from './domain/EnterpriseAgent.js';
import { HandleSupportRequestHandler, type HandleSupportRequestCommand } from './application/commands/HandleSupportRequest.js';
import { GetTicketDetailsHandler, type GetTicketDetailsQuery } from './application/queries/GetTicketDetails.js';
import { GetCustomerTicketsHandler, type GetCustomerTicketsQuery } from './application/queries/GetCustomerTickets.js';
import { InMemoryTicketRepository } from './infrastructure/repositories/TicketRepository.js';
import { QueryKnowledgeBaseTool } from './infrastructure/tools/QueryKnowledgeBaseTool.js';
import { CheckOrderStatusTool } from './infrastructure/tools/CheckOrderStatusTool.js';
import { CreateSupportTicketTool } from './infrastructure/tools/CreateSupportTicketTool.js';

/**
 * Enterprise Support Bounded Context
 *
 * This context encapsulates all enterprise support functionality including:
 * - AI-powered support agent with tool integration
 * - Knowledge base search
 * - Order tracking
 * - Ticket management
 * - Multi-language support
 */
export class EnterpriseSupportContext implements Context {
  readonly metadata: ContextMetadata = {
    name: 'enterprise-support-context',
    version: '2.0.0',
    description: 'Enterprise-grade customer support with AI agent and tool integration',
  };

  readonly name = 'EnterpriseSupport';

  private agent: EnterpriseSupportAgent;
  private toolRegistry: InMemoryToolRegistry;
  private ticketRepository: InMemoryTicketRepository;
  private supportRequestHandler: HandleSupportRequestHandler;
  private ticketDetailsHandler: GetTicketDetailsHandler;
  private customerTicketsHandler: GetCustomerTicketsHandler;

  // Store tool instances for access
  private knowledgeBaseTool: QueryKnowledgeBaseTool;
  private orderStatusTool: CheckOrderStatusTool;
  private createTicketTool: CreateSupportTicketTool;

  constructor(llmProvider: LLMProvider) {
    // Initialize tool registry
    this.toolRegistry = new InMemoryToolRegistry();

    // Create tools
    this.knowledgeBaseTool = new QueryKnowledgeBaseTool();
    this.orderStatusTool = new CheckOrderStatusTool();
    this.createTicketTool = new CreateSupportTicketTool();

    // Register tools
    this.toolRegistry.registerTool(this.knowledgeBaseTool);
    this.toolRegistry.registerTool(this.orderStatusTool);
    this.toolRegistry.registerTool(this.createTicketTool);

    // Create the enterprise support agent with tools
    this.agent = new EnterpriseSupportAgent(
      EntityId.create<'AIAgent'>(),
      new Date(),
      new Date(),
      llmProvider,
      this.toolRegistry
    );

    // Create repository
    this.ticketRepository = new InMemoryTicketRepository();

    // Create handlers
    this.supportRequestHandler = new HandleSupportRequestHandler(this.agent);
    this.ticketDetailsHandler = new GetTicketDetailsHandler(this.ticketRepository);
    this.customerTicketsHandler = new GetCustomerTicketsHandler(this.ticketRepository);
  }

  getCommands(): ContextCommandDefinition[] {
    return [
      {
        name: 'HandleSupportRequest',
        commandType: {} as new () => HandleSupportRequestCommand,
        handler: this.supportRequestHandler,
      },
    ];
  }

  getQueries(): ContextQueryDefinition[] {
    return [
      {
        name: 'GetTicketDetails',
        queryType: {} as new () => GetTicketDetailsQuery,
        handler: this.ticketDetailsHandler,
      },
      {
        name: 'GetCustomerTickets',
        queryType: {} as new () => GetCustomerTicketsQuery,
        handler: this.customerTicketsHandler,
      },
    ];
  }

  // Public accessors for the example
  getAgent(): EnterpriseSupportAgent {
    return this.agent;
  }

  getToolRegistry(): InMemoryToolRegistry {
    return this.toolRegistry;
  }

  getTicketRepository(): InMemoryTicketRepository {
    return this.ticketRepository;
  }

  getSupportRequestHandler(): HandleSupportRequestHandler {
    return this.supportRequestHandler;
  }

  getTicketDetailsHandler(): GetTicketDetailsHandler {
    return this.ticketDetailsHandler;
  }

  getCustomerTicketsHandler(): GetCustomerTicketsHandler {
    return this.customerTicketsHandler;
  }

  // Access to individual tools for testing
  getKnowledgeBaseTool(): QueryKnowledgeBaseTool {
    return this.knowledgeBaseTool;
  }

  getOrderStatusTool(): CheckOrderStatusTool {
    return this.orderStatusTool;
  }

  getCreateTicketTool(): CreateSupportTicketTool {
    return this.createTicketTool;
  }
}
