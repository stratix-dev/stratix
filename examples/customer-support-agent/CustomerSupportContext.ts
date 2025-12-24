import type {
  Context,
  ContextMetadata,
  ContextCommandDefinition,
  ContextQueryDefinition,
  LLMProvider,
} from '@stratix/core';
import { EntityId } from '@stratix/core';
import { CustomerSupportAgent } from './domain/CustomerSupportAgent.js';
import {
  type HandleCustomerInquiryCommand,
  HandleCustomerInquiryHandler,
} from './application/commands/HandleCustomerInquiry.js';
import {
  type GetCustomerInteractionHistoryQuery,
  GetCustomerInteractionHistoryHandler,
  InteractionHistoryService,
} from './application/queries/GetCustomerInteractionHistory.js';

export class CustomerSupportContext implements Context {
  readonly metadata: ContextMetadata = {
    name: 'customer-support-context',
    version: '1.0.0',
    description: 'Customer Support Agent Context',
  };

  readonly name = 'CustomerSupport';

  private agent: CustomerSupportAgent;
  private historyService: InteractionHistoryService;
  private inquiryHandler: HandleCustomerInquiryHandler;
  private historyHandler: GetCustomerInteractionHistoryHandler;

  constructor(llmProvider: LLMProvider) {
    // Create the customer support agent
    this.agent = new CustomerSupportAgent(
      EntityId.create<'AIAgent'>(),
      new Date(),
      new Date(),
      llmProvider
    );

    // Create services
    this.historyService = new InteractionHistoryService();

    // Create handlers
    this.inquiryHandler = new HandleCustomerInquiryHandler(this.agent);
    this.historyHandler = new GetCustomerInteractionHistoryHandler(this.historyService);
  }

  getCommands(): ContextCommandDefinition[] {
    return [
      {
        name: 'HandleCustomerInquiry',
        commandType: {} as new () => HandleCustomerInquiryCommand,
        handler: this.inquiryHandler,
      },
    ];
  }

  getQueries(): ContextQueryDefinition[] {
    return [
      {
        name: 'GetCustomerInteractionHistory',
        queryType: {} as new () => GetCustomerInteractionHistoryQuery,
        handler: this.historyHandler,
      },
    ];
  }

  getAgent(): CustomerSupportAgent {
    return this.agent;
  }

  getHistoryService(): InteractionHistoryService {
    return this.historyService;
  }

  getInquiryHandler(): HandleCustomerInquiryHandler {
    return this.inquiryHandler;
  }

  getHistoryHandler(): GetCustomerInteractionHistoryHandler {
    return this.historyHandler;
  }
}
