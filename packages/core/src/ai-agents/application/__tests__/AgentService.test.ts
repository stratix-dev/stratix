import { describe, it, expect, vi } from 'vitest';
import { AgentService, AgentServiceError } from '../AgentService.js';
import { AgentSpecification } from '../../domain/AgentSpecification.js';
import type { AgentSpecificationId } from '../../domain/AgentSpecification.js';
import type { LLMPort, LLMRequest, LLMCompletionResponse } from '../../domain/ports/LLMPort.js';
import { EntityId } from '../../../core/EntityId.js';
import type { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import type { ModelConfig } from '../../core/agent/ModelConfig.js';
import { Success, Failure } from '../../../result/Result.js';

// Test agent specification
class TestSpec extends AgentSpecification {
  constructor(id: AgentSpecificationId, metadata: AgentMetadata, modelConfig: ModelConfig) {
    super(id, metadata, modelConfig);
  }
}

// Test agent service
class TestAgentService extends AgentService<string, string> {
  protected prepareRequest(spec: AgentSpecification, input: string): LLMRequest {
    return {
      messages: [
        { role: 'system', content: 'Test system' },
        { role: 'user', content: input }
      ],
      config: spec.modelConfig
    };
  }

  protected parseResponse(response: LLMCompletionResponse): string {
    return response.content;
  }
}

// Mock LLM Port
class MockLLMPort implements LLMPort {
  async generate(request: LLMRequest): Promise<LLMCompletionResponse> {
    return {
      content: `Response to: ${request.messages[request.messages.length - 1].content}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      model: request.config.model,
      finishReason: 'stop'
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<{ content: string; done: boolean }> {
    yield { content: 'Hello', done: false };
    yield { content: ' World', done: true };
  }
}

describe('AgentService', () => {
  const mockId = EntityId.create<'AgentSpecification'>();
  const mockMetadata: AgentMetadata = {
    name: 'Test Agent',
    description: 'Test',
    version: '1.0.0',
    capabilities: ['test'],
    tags: []
  };
  const mockModelConfig: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  };

  it('should execute successfully', async () => {
    const llmPort = new MockLLMPort();
    const service = new TestAgentService(llmPort);
    const spec = new TestSpec(mockId, mockMetadata, mockModelConfig);

    const result = await service.execute(spec, 'Hello');

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.output).toBe('Response to: Hello');
      expect(result.value.model).toBe('gpt-4');
      expect(result.value.usage.totalTokens).toBe(30);
      expect(result.value.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('should handle validation failure', async () => {
    const llmPort = new MockLLMPort();

    // Service with validation that fails
    class ValidatingService extends TestAgentService {
      protected async validate() {
        return Failure.create(new AgentServiceError('Validation failed', 'VALIDATION_ERROR'));
      }
    }

    const service = new ValidatingService(llmPort);
    const spec = new TestSpec(mockId, mockMetadata, mockModelConfig);

    const result = await service.execute(spec, 'Hello');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error).toBeInstanceOf(AgentServiceError);
      expect(result.error.message).toBe('Validation failed');
    }
  });

  it('should handle LLM errors', async () => {
    // LLM port that throws
    class FailingLLMPort implements LLMPort {
      async generate(): Promise<LLMCompletionResponse> {
        throw new Error('LLM API failed');
      }

      async *stream(): AsyncIterable<{ content: string; done: boolean }> {
        throw new Error('Stream failed');
      }
    }

    const llmPort = new FailingLLMPort();
    const service = new TestAgentService(llmPort);
    const spec = new TestSpec(mockId, mockMetadata, mockModelConfig);

    const result = await service.execute(spec, 'Hello');

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error).toBeInstanceOf(AgentServiceError);
      expect(result.error.message).toContain('LLM API failed');
    }
  });

  it('should stream responses', async () => {
    const llmPort = new MockLLMPort();
    const service = new TestAgentService(llmPort);
    const spec = new TestSpec(mockId, mockMetadata, mockModelConfig);

    const chunks: string[] = [];
    for await (const chunk of service.executeStream(spec, 'Hello')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' World']);
  });

  it('should calculate cost', async () => {
    const llmPort = new MockLLMPort();
    const service = new TestAgentService(llmPort);
    const spec = new TestSpec(mockId, mockMetadata, mockModelConfig);

    const result = await service.execute(spec, 'Hello');

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.cost).toBeGreaterThan(0);
    }
  });
});
