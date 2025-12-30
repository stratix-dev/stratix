import { describe, it, expect } from 'vitest';
import { AIAgent } from '../AIAgent.js';
import { AgentId } from '../AgentId.js';
import { AgentMetadata, AgentCapabilities } from '../AgentMetadata.js';
import { ModelConfigHelpers } from '../ModelConfig.js';
import { ExecutionContext } from '../../execution/ExecutionContext.js';
import { ExecutionResult } from '../../execution/ExecutionResult.js';
import { ExecutionMetadataHelpers } from '../../../shared/ExecutionMetadata.js';

// Concrete test agent implementation
class TestAgent extends AIAgent<string, string> {
  constructor(
    id = AgentId.create(),
    metadata = AgentMetadata.create({
      name: 'Test Agent',
      description: 'A test agent for unit tests',
      version: '1.0.0',
      capabilities: [AgentCapabilities.CUSTOMER_SUPPORT],
      tags: ['test', 'example'],
    }),
    modelConfig = ModelConfigHelpers.create('openai', 'gpt-4')
  ) {
    super(id, metadata, modelConfig);
  }

  async execute(
    input: string,
    context: ExecutionContext
  ): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Processed: ${input}`,
      ExecutionMetadataHelpers.create(this.model.model)
    );
  }
}

// Agent with multiple capabilities
class MultiCapabilityAgent extends AIAgent<string, string> {
  constructor() {
    const id = AgentId.create();
    const metadata = AgentMetadata.create({
      name: 'Multi Agent',
      description: 'Agent with multiple capabilities',
      version: '2.0.0',
      capabilities: [
        AgentCapabilities.CUSTOMER_SUPPORT,
        AgentCapabilities.SENTIMENT_ANALYSIS,
        AgentCapabilities.SUMMARIZATION,
      ],
      tags: ['multi', 'advanced'],
    });
    const modelConfig = ModelConfigHelpers.create('anthropic', 'claude-3-opus');

    super(id, metadata, modelConfig);
  }

  async execute(
    input: string,
    context: ExecutionContext
  ): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Multi-processed: ${input}`,
      ExecutionMetadataHelpers.create(this.model.model)
    );
  }
}

describe('AIAgent', () => {
  describe('construction', () => {
    it('should create agent with all properties', () => {
      const id = AgentId.create();
      const metadata = AgentMetadata.create({
        name: 'Custom Agent',
        description: 'Custom description',
        version: '1.2.3',
        capabilities: [AgentCapabilities.DATA_ANALYSIS],
        tags: ['custom'],
      });
      const modelConfig = ModelConfigHelpers.create('openai', 'gpt-3.5-turbo');

      const agent = new TestAgent(id, metadata, modelConfig);

      expect(agent.id).toBe(id);
      expect(agent.name).toBe('Custom Agent');
      expect(agent.description).toBe('Custom description');
      expect(agent.version.toString()).toBe('1.2.3');
      expect(agent.model.model).toBe('gpt-3.5-turbo');
    });

    it('should extend AggregateRoot', () => {
      const agent = new TestAgent();

      expect(agent.id).toBeDefined();
      expect(agent.createdAt).toBeInstanceOf(Date);
      expect(agent.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('accessors', () => {
    it('should expose name', () => {
      const agent = new TestAgent();

      expect(agent.name).toBe('Test Agent');
    });

    it('should expose description', () => {
      const agent = new TestAgent();

      expect(agent.description).toBe('A test agent for unit tests');
    });

    it('should expose version', () => {
      const agent = new TestAgent();

      expect(agent.version.toString()).toBe('1.0.0');
      expect(agent.version.major).toBe(1);
      expect(agent.version.minor).toBe(0);
      expect(agent.version.patch).toBe(0);
    });

    it('should expose capabilities', () => {
      const agent = new TestAgent();

      expect(agent.capabilities).toEqual([AgentCapabilities.CUSTOMER_SUPPORT]);
      expect(Object.isFrozen(agent.capabilities)).toBe(true);
    });

    it('should expose tags', () => {
      const agent = new TestAgent();

      expect(agent.tags).toEqual(['test', 'example']);
      expect(Object.isFrozen(agent.tags)).toBe(true);
    });

    it('should expose model config', () => {
      const agent = new TestAgent();

      expect(agent.model.provider).toBe('openai');
      expect(agent.model.model).toBe('gpt-4');
    });

    it('should expose full metadata', () => {
      const agent = new TestAgent();

      expect(agent.metadata.name).toBe('Test Agent');
      expect(agent.metadata.version.toString()).toBe('1.0.0');
    });
  });

  describe('hasCapability', () => {
    it('should return true for agent capability', () => {
      const agent = new TestAgent();

      expect(agent.hasCapability(AgentCapabilities.CUSTOMER_SUPPORT)).toBe(true);
    });

    it('should return false for non-existent capability', () => {
      const agent = new TestAgent();

      expect(agent.hasCapability(AgentCapabilities.DATA_ANALYSIS)).toBe(false);
    });

    it('should support custom capabilities', () => {
      const metadata = AgentMetadata.create({
        name: 'Custom Agent',
        description: 'Test',
        version: '1.0.0',
        capabilities: ['custom_capability'],
      });
      const agent = new TestAgent(AgentId.create(), metadata);

      expect(agent.hasCapability('custom_capability')).toBe(true);
      expect(agent.hasCapability('other_capability')).toBe(false);
    });
  });

  describe('hasCapabilities', () => {
    it('should return true when agent has all capabilities', () => {
      const agent = new MultiCapabilityAgent();

      expect(
        agent.hasCapabilities([
          AgentCapabilities.CUSTOMER_SUPPORT,
          AgentCapabilities.SENTIMENT_ANALYSIS,
        ])
      ).toBe(true);
    });

    it('should return true for single capability', () => {
      const agent = new MultiCapabilityAgent();

      expect(
        agent.hasCapabilities([AgentCapabilities.CUSTOMER_SUPPORT])
      ).toBe(true);
    });

    it('should return false when missing any capability', () => {
      const agent = new MultiCapabilityAgent();

      expect(
        agent.hasCapabilities([
          AgentCapabilities.CUSTOMER_SUPPORT,
          AgentCapabilities.CODE_GENERATION, // Missing
        ])
      ).toBe(false);
    });

    it('should return true for empty array', () => {
      const agent = new TestAgent();

      expect(agent.hasCapabilities([])).toBe(true);
    });

    it('should return true when all three capabilities present', () => {
      const agent = new MultiCapabilityAgent();

      expect(
        agent.hasCapabilities([
          AgentCapabilities.CUSTOMER_SUPPORT,
          AgentCapabilities.SENTIMENT_ANALYSIS,
          AgentCapabilities.SUMMARIZATION,
        ])
      ).toBe(true);
    });
  });

  describe('hasAnyCapability', () => {
    it('should return true when agent has at least one capability', () => {
      const agent = new TestAgent();

      expect(
        agent.hasAnyCapability([
          AgentCapabilities.CUSTOMER_SUPPORT,
          AgentCapabilities.DATA_ANALYSIS,
        ])
      ).toBe(true);
    });

    it('should return false when agent has none of the capabilities', () => {
      const agent = new TestAgent();

      expect(
        agent.hasAnyCapability([
          AgentCapabilities.DATA_ANALYSIS,
          AgentCapabilities.CODE_GENERATION,
        ])
      ).toBe(false);
    });

    it('should return false for empty array', () => {
      const agent = new TestAgent();

      expect(agent.hasAnyCapability([])).toBe(false);
    });

    it('should work with multiple matching capabilities', () => {
      const agent = new MultiCapabilityAgent();

      expect(
        agent.hasAnyCapability([
          AgentCapabilities.CUSTOMER_SUPPORT,
          AgentCapabilities.SENTIMENT_ANALYSIS,
        ])
      ).toBe(true);
    });
  });

  describe('hasTag', () => {
    it('should return true for existing tag', () => {
      const agent = new TestAgent();

      expect(agent.hasTag('test')).toBe(true);
      expect(agent.hasTag('example')).toBe(true);
    });

    it('should return false for non-existent tag', () => {
      const agent = new TestAgent();

      expect(agent.hasTag('production')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const agent = new TestAgent();

      expect(agent.hasTag('test')).toBe(true);
      expect(agent.hasTag('Test')).toBe(false);
      expect(agent.hasTag('TEST')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute agent logic', async () => {
      const agent = new TestAgent();
      const context = ExecutionContext.create({
        sessionId: 'test-session',
        environment: 'development',
      });

      const result = await agent.execute('test input', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Processed: test input');
    });

    it('should receive execution context', async () => {
      let capturedContext: ExecutionContext | null = null;

      class ContextCapturingAgent extends AIAgent<string, string> {
        constructor() {
          super(
            AgentId.create(),
            AgentMetadata.create({
              name: 'Context Agent',
              description: 'Test',
              version: '1.0.0',
              capabilities: ['test'],
            }),
            ModelConfigHelpers.create('test', 'test-model')
          );
        }

        async execute(
          input: string,
          context: ExecutionContext
        ): Promise<ExecutionResult<string>> {
          capturedContext = context;
          return ExecutionResult.success(
            'output',
            ExecutionMetadataHelpers.create('test')
          );
        }
      }

      const agent = new ContextCapturingAgent();
      const context = ExecutionContext.create({
        sessionId: 'capture-test',
        environment: 'development',
      });

      await agent.execute('input', context);

      expect(capturedContext).toBe(context);
      expect(capturedContext?.sessionId).toBe('capture-test');
    });
  });

  describe('toString', () => {
    it('should return agent name and version', () => {
      const agent = new TestAgent();

      expect(agent.toString()).toBe('Test Agent v1.0.0');
    });

    it('should update with version changes', () => {
      const metadata = AgentMetadata.create({
        name: 'Versioned Agent',
        description: 'Test',
        version: '2.5.3',
        capabilities: ['test'],
      });
      const agent = new TestAgent(AgentId.create(), metadata);

      expect(agent.toString()).toBe('Versioned Agent v2.5.3');
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const agent = new TestAgent();
      const json: any = agent.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Test Agent');
      expect(json).toHaveProperty('description', 'A test agent for unit tests');
      expect(json).toHaveProperty('version', '1.0.0');
      expect(json).toHaveProperty('capabilities');
      expect(json).toHaveProperty('tags');
      expect(json).toHaveProperty('model');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });

    it('should include all metadata', () => {
      const agent = new TestAgent();
      const json: any = agent.toJSON();

      expect(json.capabilities).toEqual([AgentCapabilities.CUSTOMER_SUPPORT]);
      expect(json.tags).toEqual(['test', 'example']);
    });

    it('should include model config', () => {
      const agent = new TestAgent();
      const json: any = agent.toJSON();

      expect(json.model.provider).toBe('openai');
      expect(json.model.model).toBe('gpt-4');
    });

    it('should include timestamps', () => {
      const agent = new TestAgent();
      const json: any = agent.toJSON();

      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('integration scenarios', () => {
    it('should support different model providers', () => {
      const openaiAgent = new TestAgent(
        AgentId.create(),
        undefined,
        ModelConfigHelpers.create('openai', 'gpt-4')
      );

      const anthropicAgent = new TestAgent(
        AgentId.create(),
        undefined,
        ModelConfigHelpers.create('anthropic', 'claude-3-opus')
      );

      const localAgent = new TestAgent(
        AgentId.create(),
        undefined,
        ModelConfigHelpers.create('local', 'llama-2-70b')
      );

      expect(openaiAgent.model.provider).toBe('openai');
      expect(anthropicAgent.model.provider).toBe('anthropic');
      expect(localAgent.model.provider).toBe('local');
    });

    it('should support agents with no tags', () => {
      const metadata = AgentMetadata.create({
        name: 'Tagless Agent',
        description: 'No tags',
        version: '1.0.0',
        capabilities: ['test'],
      });
      const agent = new TestAgent(AgentId.create(), metadata);

      expect(agent.tags).toEqual([]);
      expect(agent.hasTag('any')).toBe(false);
    });

    it('should maintain immutability', () => {
      const agent = new TestAgent();

      // Attempting to modify should not affect agent
      expect(() => {
        (agent.capabilities as any).push('new_capability');
      }).toThrow();

      expect(() => {
        (agent.tags as any).push('new_tag');
      }).toThrow();

      // Original values unchanged
      expect(agent.capabilities).toEqual([AgentCapabilities.CUSTOMER_SUPPORT]);
      expect(agent.tags).toEqual(['test', 'example']);
    });
  });
});
