import {
  WorkflowBuilder,
  StandardWorkflowEngine,
  InMemoryTelemetry,
} from '@stratix/runtime/ai';
import type { Workflow } from '@stratix/core/ai-agents';

/**
 * Document Processing Workflow Example
 *
 * This example demonstrates a complex multi-step workflow with:
 * 1. Sequential processing steps
 * 2. Conditional branching
 * 3. Parallel execution
 * 4. Human-in-the-loop approval
 * 5. Transform steps
 * 6. Variable passing between steps
 */

interface DocumentData {
  id: string;
  filename: string;
  content: string;
  size: number;
}

// Mock document data
const mockDocument: DocumentData = {
  id: 'doc-2024-001',
  filename: 'contract-2024.pdf',
  content: `
    This is a sample legal contract between Company A and Company B.
    The agreement outlines the terms of service delivery and payment schedules.
    Both parties agree to the following terms and conditions...
    [Content continues for several pages]
  `,
  size: 1247,
};

async function main() {
  console.log('📄 Document Processing Workflow Example\n');

  // 1. Initialize Telemetry
  const telemetry = new InMemoryTelemetry({
    serviceName: 'document-processor',
    serviceVersion: '1.0.0',
  });

  // 2. Build the Workflow
  console.log('🔨 Building workflow...\n');

  const workflow: Workflow = new WorkflowBuilder('document-processing', '1.0.0')
    .name('Document Processing Pipeline')
    .withTimeout(600000) // 10 minutes
    .withMetadata({
      description: 'Process uploaded documents through validation, analysis, and approval',
      author: 'Stratix Team',
      tags: ['document', 'processing', 'ai'],
    })

    // Step 1: Extract text from document
    .transform(
      WorkflowBuilder.variable('document'),
      '${$input.content}',
      'extractedText'
    )

    // Step 2: Validate content
    .transform(
      WorkflowBuilder.variable('extractedText'),
      // Simple validation: check if content length > 0
      '${$input.length}',
      'contentLength'
    )

    // Step 3: Check if content is valid
    .condition(
      '${contentLength}',
      // Valid content - proceed with analysis
      (then) =>
        then
          // Step 4: Parallel analysis
          .parallel(
            // Branch 1: Sentiment analysis
            (b1) =>
              b1.transform(
                WorkflowBuilder.variable('extractedText'),
                // Mock sentiment: positive for contracts
                'positive',
                'sentiment'
              ),

            // Branch 2: Entity extraction
            (b2) =>
              b2.transform(
                WorkflowBuilder.variable('extractedText'),
                // Mock entities
                'Company A, Company B, Terms of Service',
                'entities'
              ),

            // Branch 3: Categorization
            (b3) =>
              b3.transform(
                WorkflowBuilder.variable('extractedText'),
                // Mock category
                'Legal/Contract',
                'category'
              )
          )

          // Step 5: Generate summary from analysis results
          .transform(
            WorkflowBuilder.expression(
              'Sentiment: ${sentiment}, Entities: ${entities}, Category: ${category}'
            ),
            '${$input}',
            'summary'
          )

          // Step 6: Human review
          .humanApproval(
            'Review and approve this document',
            ['Approve', 'Reject', 'Request Changes'],
            {
              timeout: 300000, // 5 minutes
              assignee: 'reviewer@company.com',
              output: 'reviewDecision',
            }
          )

          // Step 7: Check approval
          .condition(
            '${reviewDecision}',
            // Approved - publish
            (thenApproved) =>
              thenApproved.transform(
                WorkflowBuilder.literal('published'),
                '${$input}',
                'status'
              ),
            // Rejected - archive
            (elseRejected) =>
              elseRejected.transform(
                WorkflowBuilder.literal('archived'),
                '${$input}',
                'status'
              )
          ),

      // Invalid content - reject
      (els) =>
        els.transform(
          WorkflowBuilder.literal('rejected'),
          '${$input}',
          'status'
        )
    )

    .build();

  console.log(`✓ Workflow created: "${workflow.name}"`);
  console.log(`  - Steps: ${workflow.steps.length}`);
  console.log(`  - Version: ${workflow.version}`);
  console.log(`  - Timeout: ${workflow.timeout}ms\n`);

  // 3. Initialize Workflow Engine
  console.log('⚙️  Initializing workflow engine...\n');

  const engine = new StandardWorkflowEngine({
    humanHandler: async (prompt, options) => {
      // Simulate human approval
      console.log(`  👤 Human Review Requested`);
      console.log(`     Prompt: ${prompt}`);
      console.log(`     Options: ${options?.join(', ')}`);
      console.log(`     ✓ Auto-approved for demo\n`);
      return 'Approve';
    },
  });

  // 4. Execute Workflow
  console.log('🚀 Executing workflow for document:', mockDocument.filename);
  console.log('─'.repeat(60));
  console.log('');

  const executionSpan = telemetry.startSpan('execute-workflow', 'workflow.execute');

  const result = await engine.execute(workflow, {
    document: mockDocument,
    documentId: mockDocument.id,
  });

  executionSpan.end();

  if (result.isSuccess) {
    const execution = result.value;

    console.log('✅ Workflow completed successfully!\n');
    console.log('Execution Details:');
    console.log('─'.repeat(60));
    console.log(`  Execution ID: ${execution.id}`);
    console.log(`  Status: ${execution.status}`);
    console.log(`  Duration: ${execution.endTime!.getTime() - execution.startTime.getTime()}ms`);
    console.log(`  Steps Executed: ${execution.stepHistory.length}`);

    console.log('\n📊 Step History:');
    execution.stepHistory.forEach((step, index) => {
      const duration = step.endTime
        ? step.endTime.getTime() - step.startTime.getTime()
        : 0;
      console.log(
        `  ${index + 1}. [${step.status.toUpperCase()}] ${step.stepType} (${duration}ms)`
      );
    });

    console.log('\n💾 Final Variables:');
    Object.entries(execution.variables).forEach(([key, value]) => {
      if (key === 'document') {
        console.log(`  ${key}: [DocumentData object]`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    // Record workflow metrics
    telemetry.recordWorkflow({
      traceId: telemetry.getContext().traceId,
      spanId: executionSpan.id,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      totalSteps: workflow.steps.length,
      completedSteps: execution.stepHistory.filter((s) => s.status === 'completed').length,
      failedSteps: execution.stepHistory.filter((s) => s.status === 'failed').length,
      skippedSteps: execution.stepHistory.filter((s) => s.status === 'skipped').length,
      latencyMs: executionSpan.durationMs || 0,
      success: true,
      timestamp: new Date(),
    });
  } else {
    console.log('❌ Workflow failed!');
    console.log(`  Error: ${result.error.message}`);

    telemetry.recordWorkflow({
      traceId: telemetry.getContext().traceId,
      spanId: executionSpan.id,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      totalSteps: workflow.steps.length,
      completedSteps: 0,
      failedSteps: 1,
      skippedSteps: 0,
      latencyMs: executionSpan.durationMs || 0,
      success: false,
      error: result.error.message,
      timestamp: new Date(),
    });
  }

  // 5. Display Telemetry
  console.log('\n\n📈 Workflow Telemetry');
  console.log('═'.repeat(60));

  const metrics = telemetry.getMetrics();
  const stats = telemetry.getStatistics();

  console.log('\nWorkflow Metrics:');
  console.log(`  Total Workflows: ${stats.totalWorkflows}`);
  console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
  console.log(`  Average Duration: ${stats.averageDuration.toFixed(2)}ms`);

  console.log('\nSpan Breakdown:');
  Object.entries(stats.spansByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\n✨ Demo complete!\n');
}

// Run the example
main().catch((error) => {
  console.error('Error running example:', error);
  process.exit(1);
});
