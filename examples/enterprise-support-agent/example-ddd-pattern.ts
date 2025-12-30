/**
 * Example: Customer Support Agent using DDD Pattern
 *
 * This example demonstrates the hexagonal architecture pattern where:
 * - Domain: Pure business logic (AgentSpecification)
 * - Application: Orchestration (AgentService)
 * - Infrastructure: External I/O (LLMPort implementation)
 *
 * File structure:
 * ```
 * domain/
 *   └── CustomerSupportAgentSpec.ts   ← Pure domain logic, no I/O
 * application/
 *   └── CustomerSupportService.ts     ← Orchestrates domain + infrastructure
 * infrastructure/
 *   └── OpenAILLMAdapter.ts            ← Implements LLMPort
 * ```
 */

import { EntityId } from '@stratix/core';
import { CustomerSupportAgentSpec } from './domain/CustomerSupportAgentSpec.js';
import { CustomerSupportService } from './application/CustomerSupportService.js';
import { OpenAILLMAdapter } from './infrastructure/OpenAILLMAdapter.js';

async function main() {
  console.log('🏛️  Enterprise Support Agent - DDD Pattern Example\n');

  // ===== INFRASTRUCTURE LAYER =====
  // Create LLM adapter (implements LLMPort)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const llmAdapter = new OpenAILLMAdapter(apiKey);
  console.log('✅ Infrastructure: OpenAI LLM Adapter created');

  // ===== DOMAIN LAYER =====
  // Create agent specification (pure domain entity)
  const agentSpec = new CustomerSupportAgentSpec(EntityId.create());
  console.log(`✅ Domain: Agent Spec "${agentSpec.name}" v${agentSpec.version}`);
  console.log(`   Capabilities: ${agentSpec.capabilities.join(', ')}\n`);

  // ===== APPLICATION LAYER =====
  // Create service (orchestrates domain + infrastructure)
  const supportService = new CustomerSupportService(llmAdapter);
  console.log('✅ Application: Customer Support Service created\n');

  // ===== EXAMPLE 1: Simple Query =====
  console.log('📝 Example 1: Simple password reset query\n');

  const query1 = {
    query: 'How do I reset my password?',
    customerId: 'customer-123',
  };

  const result1 = await supportService.execute(agentSpec, query1);

  if (result1.isSuccess) {
    const { output, model, usage, cost, durationMs } = result1.value;

    console.log(`🤖 Response (${model}):`);
    console.log(`   ${output.response}\n`);
    console.log(`📊 Metadata:`);
    console.log(`   Priority: ${output.priority}`);
    console.log(`   Should Escalate: ${output.shouldEscalate}`);
    console.log(`   Tokens: ${usage.totalTokens} (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`);
    console.log(`   Cost: $${cost.toFixed(6)}`);
    console.log(`   Duration: ${durationMs}ms\n`);

    if (output.followUpActions) {
      console.log(`📋 Follow-up Actions:`);
      output.followUpActions.forEach((action) => {
        console.log(`   • ${action}`);
      });
      console.log();
    }
  } else {
    console.error(`❌ Error: ${result1.error.message}\n`);
  }

  // ===== EXAMPLE 2: Escalation Case =====
  console.log('📝 Example 2: Query requiring escalation\n');

  const query2 = {
    query: 'This is unacceptable! I want a full refund immediately or I will contact my lawyer!',
    customerId: 'customer-456',
  };

  const result2 = await supportService.execute(agentSpec, query2);

  if (result2.isSuccess) {
    const { output } = result2.value;

    console.log(`🤖 Response:`);
    console.log(`   ${output.response}\n`);
    console.log(`📊 Metadata:`);
    console.log(`   Priority: ${output.priority}`);
    console.log(`   Should Escalate: ${output.shouldEscalate}`);

    if (output.followUpActions) {
      console.log(`\n📋 Follow-up Actions:`);
      output.followUpActions.forEach((action) => {
        console.log(`   • ${action}`);
      });
    }
    console.log();
  }

  // ===== EXAMPLE 3: Domain Rule Validation =====
  console.log('📝 Example 3: Invalid query (too long)\n');

  const query3 = {
    query: 'a'.repeat(10000), // Exceeds max length
    customerId: 'customer-789',
  };

  const result3 = await supportService.execute(agentSpec, query3);

  if (result3.isFailure) {
    console.log(`✅ Domain validation correctly rejected query:`);
    console.log(`   ${result3.error.message}\n`);
  }

  // ===== EXAMPLE 4: Streaming Response =====
  console.log('📝 Example 4: Streaming response\n');

  const query4 = {
    query: 'What are your business hours?',
    customerId: 'customer-999',
  };

  console.log('🤖 Streaming response:');
  process.stdout.write('   ');

  for await (const chunk of supportService.executeStream(agentSpec, query4)) {
    process.stdout.write(chunk.response);
  }

  console.log('\n\n✨ All examples completed!\n');

  // ===== ARCHITECTURAL BENEFITS =====
  console.log('🏛️  Architectural Benefits of this Pattern:\n');
  console.log('   ✅ Domain Layer: Pure business logic, no I/O, easy to test');
  console.log('   ✅ Application Layer: Orchestration, coordinates domain + infrastructure');
  console.log('   ✅ Infrastructure Layer: External I/O, can swap providers easily');
  console.log('   ✅ Dependency Inversion: Domain defines ports, infrastructure implements');
  console.log('   ✅ Testability: Mock LLMPort for fast unit tests');
  console.log('   ✅ Maintainability: Clear separation of concerns\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
