import { type Command, type CommandHandler, Success, Failure, type Result } from '@stratix/core';
import type { SupportRequest, SupportResponse } from '../../domain/types.js';
import type { EnterpriseSupportAgent } from '../../domain/EnterpriseAgent.js';

export interface HandleSupportRequestCommand extends Command {
  readonly request: SupportRequest;
}

/**
 * Command handler for processing customer support requests
 */
export class HandleSupportRequestHandler
  implements CommandHandler<HandleSupportRequestCommand, Result<SupportResponse, Error>>
{
  constructor(private readonly agent: EnterpriseSupportAgent) {}

  async handle(
    command: HandleSupportRequestCommand
  ): Promise<Result<SupportResponse, Error>> {
    try {
      // Execute the agent with the support request
      const agentResult = await this.agent.executeWithEvents(command.request);

      // Convert AgentResult to Result
      if (agentResult.isSuccess()) {
        return Success.create(agentResult.data);
      } else {
        return Failure.create(
          agentResult.error || new Error('Agent execution failed')
        );
      }
    } catch (error) {
      return Failure.create(
        new Error(`Failed to handle support request: ${(error as Error).message}`)
      );
    }
  }
}