import { CustomerSupportContext } from './CustomerSupportContext.js';
import type { HandleCustomerInquiryCommand } from './application/commands/HandleCustomerInquiry.js';
import type { GetCustomerInteractionHistoryQuery } from './application/queries/GetCustomerInteractionHistory.js';
import { OpenAIProvider } from '@stratix/ai-openai';

/**
 * Example usage of the Customer Support Agent
 *
 * This example demonstrates how to use the agent with OpenAI's API
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY environment variable
 * - Example: export OPENAI_API_KEY=sk-...
 */
async function main() {
  console.log('Customer Support Agent Example\n');

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

  console.log('OpenAI provider configured successfully');
  console.log('Supported models:', openAIProvider.models.join(', '));
  console.log('');

  // 2. Create the context with the LLM provider
  const context = new CustomerSupportContext(openAIProvider);
  const inquiryHandler = context.getInquiryHandler();
  const historyHandler = context.getHistoryHandler();
  const agent = context.getAgent();

  // 3. Example: Handle a billing inquiry
  console.log('--- Example 1: Billing Inquiry ---');
  const billingInquiry: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-12345',
      inquiryText: 'I was charged twice for my last order. Can you help me get a refund?',
      category: 'billing',
      previousContext: [
        'Customer ordered product XYZ on 2025-01-15',
        'Order total was $99.99',
      ],
    },
  };

  const billingResult = await inquiryHandler.handle(billingInquiry);
  if (billingResult.isSuccess) {
    console.log('Response:', billingResult.value.responseText);
    console.log('Suggested Actions:', billingResult.value.suggestedActions);
    console.log('Escalation Required:', billingResult.value.escalationRequired);
    console.log('Confidence:', billingResult.value.confidence);
    console.log('Category:', billingResult.value.category);

    // Get execution metadata from domain events
    const events = agent.pullDomainEvents();
    const completedEvent = events.find((e: any) => e.eventType === 'AgentExecutionCompleted');
    if (completedEvent) {
      console.log('Tokens Used:', (completedEvent as any).metadata?.totalTokens || 'N/A');
      console.log('Cost:', `$${((completedEvent as any).metadata?.cost || 0).toFixed(6)}`);
      console.log('Duration:', `${(completedEvent as any).metadata?.duration || 0}ms`);
    }

    // Record in history
    context.getHistoryService().record('cust-12345', {
      timestamp: new Date(),
      inquiry: billingInquiry.inquiry.inquiryText,
      response: billingResult.value.responseText,
      category: billingResult.value.category,
      escalated: billingResult.value.escalationRequired,
    });
  } else {
    console.error('Error:', billingResult.error);
  }

  // 4. Example: Handle a technical inquiry
  console.log('\n--- Example 2: Technical Inquiry ---');
  const technicalInquiry: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-67890',
      inquiryText: 'The app keeps crashing when I try to upload photos. What should I do?',
      category: 'technical',
    },
  };

  const technicalResult = await inquiryHandler.handle(technicalInquiry);
  if (technicalResult.isSuccess) {
    console.log('Response:', technicalResult.value.responseText);
    console.log('Suggested Actions:', technicalResult.value.suggestedActions);
    console.log('Escalation Required:', technicalResult.value.escalationRequired);
    console.log('Category:', technicalResult.value.category);

    // Record in history
    context.getHistoryService().record('cust-67890', {
      timestamp: new Date(),
      inquiry: technicalInquiry.inquiry.inquiryText,
      response: technicalResult.value.responseText,
      category: technicalResult.value.category,
      escalated: technicalResult.value.escalationRequired,
    });
  } else {
    console.error('Error:', technicalResult.error);
  }

  // 5. Example: Handle a complaint (should escalate)
  console.log('\n--- Example 3: Complaint (Auto-Escalation) ---');
  const complaintInquiry: HandleCustomerInquiryCommand = {
    inquiry: {
      customerId: 'cust-99999',
      inquiryText:
        'This is unacceptable! I have been waiting for 2 weeks and still no response!',
      category: 'complaint',
    },
  };

  const complaintResult = await inquiryHandler.handle(complaintInquiry);
  if (complaintResult.isSuccess) {
    console.log('Response:', complaintResult.value.responseText);
    console.log('Escalation Required:', complaintResult.value.escalationRequired);
    console.log('Category:', complaintResult.value.category);

    if (complaintResult.value.escalationRequired) {
      console.log('\n*** ESCALATED TO HUMAN SUPPORT ***\n');
    }

    // Record in history
    context.getHistoryService().record('cust-99999', {
      timestamp: new Date(),
      inquiry: complaintInquiry.inquiry.inquiryText,
      response: complaintResult.value.responseText,
      category: complaintResult.value.category,
      escalated: complaintResult.value.escalationRequired,
    });
  } else {
    console.error('Error:', complaintResult.error);
  }

  // 6. Example: Get interaction history
  console.log('\n--- Example 4: Customer Interaction History ---');
  const historyQuery: GetCustomerInteractionHistoryQuery = {
    customerId: 'cust-12345',
    limit: 5,
  };
  const historyResult = await historyHandler.handle(historyQuery);

  if (historyResult.isSuccess) {
    console.log(`Found ${historyResult.value.length} interaction(s):`);
    historyResult.value.forEach((interaction, index) => {
      console.log(`\n${index + 1}. ${interaction.timestamp.toISOString()}`);
      console.log(`   Category: ${interaction.category}`);
      console.log(`   Inquiry: ${interaction.inquiry.substring(0, 60)}...`);
      console.log(`   Escalated: ${interaction.escalated}`);
    });
  } else {
    console.error('Error retrieving history:', historyResult.error);
  }

  console.log('\nExample completed successfully!');
}

// Run the example
main().catch(console.error);
