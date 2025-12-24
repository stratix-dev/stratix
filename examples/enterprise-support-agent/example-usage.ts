import { EnterpriseSupportContext } from './EnterpriseSupportContext.js';
import type { HandleSupportRequestCommand } from './application/commands/HandleSupportRequest.js';
import type { GetCustomerTicketsQuery } from './application/queries/GetCustomerTickets.js';
import { OpenAIProvider } from '@stratix/ai-openai';

/**
 * Enterprise Support Agent Example
 *
 * This example demonstrates advanced features:
 * - AI agent with tool integration
 * - Knowledge base search
 * - Order status checking
 * - Support ticket creation
 * - Sentiment analysis
 * - Intelligent escalation
 * - Multi-language support
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Example: export OPENAI_API_KEY=sk-...
 */
async function main() {
  console.log('Enterprise Support Agent Example\n');

  // 1. Configure OpenAI Provider
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: OPENAI_API_KEY environment variable is not set');
    console.error('Please set your OpenAI API key:');
    console.error('  export OPENAI_API_KEY=sk-...\n');
    process.exit(1);
  }

  const openAIProvider = new OpenAIProvider({
    apiKey,
    models: [
      {
        name: 'gpt-4o',
        pricing: {
          input: 2.5, // $2.50 per 1M tokens
          output: 10.0, // $10.00 per 1M tokens
        },
      },
      {
        name: 'gpt-4o-mini',
        pricing: {
          input: 0.15, // $0.15 per 1M tokens
          output: 0.6, // $0.60 per 1M tokens
        },
      },
    ],
  });

  console.log('OpenAI provider configured successfully\n');

  // 2. Create the Enterprise Support Context
  const context = new EnterpriseSupportContext(openAIProvider);
  const handler = context.getSupportRequestHandler();
  const ticketsHandler = context.getCustomerTicketsHandler();
  const agent = context.getAgent();

  console.log('Available tools:');
  const tools = await context.getToolRegistry().listTools();
  tools.forEach(tool => console.log(`  - ${tool.name}: ${tool.description}`));
  console.log('');

  // Example 1: Simple technical support query
  console.log('--- Example 1: Technical Support with Knowledge Base ---');
  const technicalRequest: HandleSupportRequestCommand = {
    request: {
      customerId: 'cust-001',
      message: 'My app keeps crashing when I try to upload photos. What should I do?',
      metadata: {
        accountAge: 45,
        previousTickets: 1,
        customerTier: 'premium',
      },
    },
  };

  const result1 = await handler.handle(technicalRequest);
  if (result1.isSuccess) {
    const response = result1.value;
    console.log('Agent Response:', response.message);
    console.log('Category:', response.category);
    console.log('Priority:', response.priority);
    console.log('Sentiment:', `${response.sentiment.label} (${response.sentiment.score.toFixed(2)})`);
    console.log('Escalation Required:', response.requiresEscalation);
    console.log('Suggested Actions:', response.suggestedActions);
    console.log('Confidence:', response.confidence.toFixed(2));

    // Show execution metadata
    const events = agent.pullDomainEvents();
    const completedEvent = events.find((e: any) => e.eventType === 'AgentExecutionCompleted');
    if (completedEvent) {
      console.log('Tokens Used:', (completedEvent as any).metadata?.totalTokens || 'N/A');
      console.log('Cost:', `$${((completedEvent as any).metadata?.cost || 0).toFixed(6)}`);
    }
  } else {
    console.error('Error:', result1.error);
  }

  // Example 2: Billing query with order tracking
  console.log('\n--- Example 2: Billing Query with Order Tracking ---');
  const billingRequest: HandleSupportRequestCommand = {
    request: {
      customerId: 'cust-001',
      message: 'I was charged for order ORD-12345 but I want to check the status before paying.',
      metadata: {
        orderId: 'ORD-12345',
        accountAge: 45,
        previousTickets: 1,
        customerTier: 'premium',
      },
    },
  };

  const result2 = await handler.handle(billingRequest);
  if (result2.isSuccess) {
    const response = result2.value;
    console.log('Agent Response:', response.message);
    console.log('Category:', response.category);
    console.log('Priority:', response.priority);
    console.log('Order Referenced:', response.metadata.orderId || 'N/A');
    console.log('Knowledge Articles:', response.metadata.knowledgeArticles || []);
  } else {
    console.error('Error:', result2.error);
  }

  // Example 3: Complaint with escalation
  console.log('\n--- Example 3: Complaint with Auto-Escalation ---');
  const complaintRequest: HandleSupportRequestCommand = {
    request: {
      customerId: 'cust-002',
      message: "This is ridiculous! I've been waiting for 3 weeks and nobody has responded to my refund request. I want my money back NOW!",
      metadata: {
        accountAge: 120,
        previousTickets: 5,
        customerTier: 'free',
      },
    },
  };

  const result3 = await handler.handle(complaintRequest);
  if (result3.isSuccess) {
    const response = result3.value;
    console.log('Agent Response:', response.message);
    console.log('Category:', response.category);
    console.log('Priority:', response.priority);
    console.log('Sentiment:', `${response.sentiment.label} (${response.sentiment.score.toFixed(2)})`);
    console.log('Escalation Required:', response.requiresEscalation);

    if (response.requiresEscalation) {
      console.log('\n*** ESCALATED TO HUMAN SUPPORT ***');
      console.log('Escalation Reason:', response.metadata.escalationReason || 'High priority issue');
    }

    if (response.metadata.ticketId) {
      console.log('Ticket Created:', response.metadata.ticketId);

      // Save the ticket to repository for tracking
      const createTicketTool = context.getCreateTicketTool();
      const createdTickets = createTicketTool.listTickets();
      const ticket = createdTickets.find(t => t.id === response.metadata.ticketId);

      if (ticket) {
        await context.getTicketRepository().save(ticket);
        console.log('Ticket saved to repository');
      }
    }
  } else {
    console.error('Error:', result3.error);
  }

  // Example 4: Multi-turn conversation
  console.log('\n--- Example 4: Multi-Turn Conversation ---');
  const conversationRequest: HandleSupportRequestCommand = {
    request: {
      customerId: 'cust-003',
      message: 'Can I upgrade my plan?',
      conversationHistory: [
        {
          role: 'customer',
          content: 'Hi, I have a question about pricing',
          timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        },
        {
          role: 'agent',
          content: 'Hello! I\'d be happy to help you with pricing questions. What would you like to know?',
          timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
        },
      ],
      metadata: {
        accountAge: 30,
        previousTickets: 0,
        customerTier: 'free',
      },
    },
  };

  const result4 = await handler.handle(conversationRequest);
  if (result4.isSuccess) {
    const response = result4.value;
    console.log('Agent Response:', response.message);
    console.log('Category:', response.category);
    console.log('Suggested Actions:', response.suggestedActions);
  } else {
    console.error('Error:', result4.error);
  }

  // Example 5: Query customer tickets
  console.log('\n--- Example 5: Customer Ticket History ---');
  const ticketsQuery: GetCustomerTicketsQuery = {
    customerId: 'cust-002',
    limit: 5,
  };

  const ticketsResult = await ticketsHandler.handle(ticketsQuery);
  if (ticketsResult.isSuccess) {
    console.log(`Found ${ticketsResult.value.length} ticket(s):`);
    ticketsResult.value.forEach((ticket, index) => {
      console.log(`\n${index + 1}. ${ticket.id}`);
      console.log(`   Subject: ${ticket.subject}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Priority: ${ticket.priority}`);
      console.log(`   Created: ${ticket.createdAt.toISOString()}`);
    });
  } else {
    console.error('Error:', ticketsResult.error);
  }

  // Example 6: International customer (Spanish)
  console.log('\n--- Example 6: Multi-Language Support (Spanish) ---');
  const spanishRequest: HandleSupportRequestCommand = {
    request: {
      customerId: 'cust-004',
      message: 'Hola, necesito ayuda con mi pedido. ¿Dónde está?',
      metadata: {
        preferredLanguage: 'es',
        accountAge: 15,
        previousTickets: 0,
        customerTier: 'free',
      },
    },
  };

  const result6 = await handler.handle(spanishRequest);
  if (result6.isSuccess) {
    const response = result6.value;
    console.log('Agent Response:', response.message);
    console.log('Detected Language:', response.language);
    console.log('Category:', response.category);
  } else {
    console.error('Error:', result6.error);
  }

  console.log('\n=== Example Completed Successfully ===');
  console.log('\nKey Features Demonstrated:');
  console.log('- AI agent with tool integration');
  console.log('- Knowledge base search');
  console.log('- Order status checking');
  console.log('- Automatic ticket creation');
  console.log('- Sentiment analysis');
  console.log('- Intelligent escalation');
  console.log('- Multi-turn conversations');
  console.log('- Multi-language support');
  console.log('- CQRS pattern (commands and queries)');
  console.log('- Repository pattern');
  console.log('- Domain events');
}

// Run the example
main().catch(console.error);
