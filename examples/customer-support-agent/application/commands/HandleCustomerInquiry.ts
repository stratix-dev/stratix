import {
  type Command,
  type CommandHandler,
  Success,
  Failure,
  type Result,
} from '@stratix/core';
import type { CustomerInquiry, SupportResponse } from '../../domain/CustomerSupportAgent.js';
import type { CustomerSupportAgent } from '../../domain/CustomerSupportAgent.js';

export interface HandleCustomerInquiryCommand extends Command {
  readonly inquiry: CustomerInquiry;
}

export class HandleCustomerInquiryHandler
  implements CommandHandler<HandleCustomerInquiryCommand, Result<SupportResponse, Error>>
{
  constructor(private readonly agent: CustomerSupportAgent) {}

  async handle(
    command: HandleCustomerInquiryCommand
  ): Promise<Result<SupportResponse, Error>> {
    try {
      // Execute the agent with the customer inquiry
      const agentResult = await this.agent.executeWithEvents(command.inquiry);

      // Convert AgentResult to Result
      if (agentResult.isSuccess()) {
        return Success.create(agentResult.data);
      } else {
        return Failure.create(agentResult.error || new Error('Agent execution failed'));
      }
    } catch (error) {
      return Failure.create(
        new Error(`Failed to handle customer inquiry: ${(error as Error).message}`)
      );
    }
  }
}
