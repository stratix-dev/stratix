import { describe, it, expect } from 'vitest';
import { AgentSpecification } from '../AgentSpecification.js';
import type { AgentSpecificationId } from '../AgentSpecification.js';
import { EntityId } from '../../../core/EntityId.js';
import type { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import type { ModelConfig } from '../../core/agent/ModelConfig.js';

// Test implementation
class TestAgentSpec extends AgentSpecification {
  constructor(id: AgentSpecificationId, metadata: AgentMetadata, modelConfig: ModelConfig) {
    super(id, metadata, modelConfig);
  }
}

describe('AgentSpecification', () => {
  const mockId = EntityId.create<'AgentSpecification'>();
  const mockMetadata: AgentMetadata = {
    name: 'Test Agent',
    description: 'Test agent for unit tests',
    version: '1.0.0',
    capabilities: ['test-capability', 'another-capability'],
    tags: ['test', 'unit']
  };
  const mockModelConfig: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  };

  it('should create an agent specification', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    expect(spec.name).toBe('Test Agent');
    expect(spec.description).toBe('Test agent for unit tests');
    expect(spec.version).toBe('1.0.0');
    expect(spec.capabilities).toEqual(['test-capability', 'another-capability']);
    expect(spec.tags).toEqual(['test', 'unit']);
  });

  it('should check if agent has capability', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    expect(spec.hasCapability('test-capability')).toBe(true);
    expect(spec.hasCapability('non-existent')).toBe(false);
  });

  it('should check if agent has any capability', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    expect(spec.hasAnyCapability('test-capability', 'non-existent')).toBe(true);
    expect(spec.hasAnyCapability('non-existent', 'also-non-existent')).toBe(false);
  });

  it('should check if agent has all capabilities', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    expect(spec.hasAllCapabilities('test-capability', 'another-capability')).toBe(true);
    expect(spec.hasAllCapabilities('test-capability', 'non-existent')).toBe(false);
  });

  it('should update model config immutably', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);
    const originalTemp = spec.modelConfig.temperature;

    const updated = spec.withModelConfig({ temperature: 0.9 });

    expect(spec.modelConfig.temperature).toBe(originalTemp); // Original unchanged
    expect(updated.modelConfig.temperature).toBe(0.9); // New instance updated
    expect(updated.modelConfig.model).toBe('gpt-4'); // Other fields preserved
  });

  it('should check compatibility with another spec', () => {
    const spec1 = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    const spec2 = new TestAgentSpec(
      EntityId.create<'AgentSpecification'>(),
      {
        ...mockMetadata,
        capabilities: ['test-capability'] // Subset of spec1
      },
      mockModelConfig
    );

    const spec3 = new TestAgentSpec(
      EntityId.create<'AgentSpecification'>(),
      {
        ...mockMetadata,
        capabilities: ['different-capability']
      },
      mockModelConfig
    );

    expect(spec1.isCompatibleWith(spec2)).toBe(true); // spec1 has all of spec2's capabilities
    expect(spec1.isCompatibleWith(spec3)).toBe(false); // spec1 doesn't have spec3's capability
  });

  it('should expose metadata and config as readonly', () => {
    const spec = new TestAgentSpec(mockId, mockMetadata, mockModelConfig);

    expect(spec.metadata).toBe(mockMetadata);
    expect(spec.modelConfig).toBe(mockModelConfig);
  });
});
