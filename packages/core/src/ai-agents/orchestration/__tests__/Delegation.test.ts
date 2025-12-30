import { describe, it, expect } from 'vitest';
import {
  Delegation,
  AgentPool,
  NoDelegateFoundError,
  CapabilitySelector,
  MultiCapabilitySelector,
  AnyCapabilitySelector,
  FirstAgentSelector,
  RandomAgentSelector,
  RoundRobinSelector,
  PredicateSelector,
} from '../Delegation.js';
import { AIAgent } from '../../core/agent/AIAgent.js';
import { AgentId } from '../../core/agent/AgentId.js';
import { AgentMetadata, AgentCapabilities } from '../../core/agent/AgentMetadata.js';
import { ModelConfigHelpers } from '../../core/agent/ModelConfig.js';
import { ExecutionContext } from '../../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../../core/execution/ExecutionResult.js';
import { ExecutionMetadataHelpers } from '../../shared/ExecutionMetadata.js';

// Test agent with specific capability
class SentimentAgent extends AIAgent<string, string> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Sentiment Analyzer',
        description: 'Analyzes sentiment',
        version: '1.0.0',
        capabilities: [AgentCapabilities.SENTIMENT_ANALYSIS],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Sentiment: ${input}`,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent with multiple capabilities
class MultiAgent extends AIAgent<string, string> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Multi Agent',
        description: 'Multiple capabilities',
        version: '1.0.0',
        capabilities: [
          AgentCapabilities.SUMMARIZATION,
          AgentCapabilities.TRANSLATION,
        ],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Multi: ${input}`,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent without specific capabilities
class GenericAgent extends AIAgent<string, string> {
  constructor(private suffix: string = '') {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: `Generic Agent ${suffix}`,
        description: 'Generic agent',
        version: '1.0.0',
        capabilities: ['generic'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Generic${this.suffix}: ${input}`,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

describe('Selectors', () => {
  describe('CapabilitySelector', () => {
    it('should select agent with capability', () => {
      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);
      const agents = [new GenericAgent(), new SentimentAgent(), new MultiAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeInstanceOf(SentimentAgent);
    });

    it('should return undefined if no match', () => {
      const selector = new CapabilitySelector(AgentCapabilities.DATA_ANALYSIS);
      const agents = [new GenericAgent(), new SentimentAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeUndefined();
    });

    it('should return first match', () => {
      const selector = new CapabilitySelector(AgentCapabilities.SUMMARIZATION);
      const agent1 = new MultiAgent(); // Has SUMMARIZATION
      const agent2 = new MultiAgent(); // Also has SUMMARIZATION
      const agents = [agent1, agent2];

      const selected = selector.select(agents);

      expect(selected).toBe(agent1);
    });
  });

  describe('MultiCapabilitySelector', () => {
    it('should select agent with all capabilities', () => {
      const selector = new MultiCapabilitySelector([
        AgentCapabilities.SUMMARIZATION,
        AgentCapabilities.TRANSLATION,
      ]);
      const agents = [new GenericAgent(), new SentimentAgent(), new MultiAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeInstanceOf(MultiAgent);
    });

    it('should return undefined if missing any capability', () => {
      const selector = new MultiCapabilitySelector([
        AgentCapabilities.SUMMARIZATION,
        AgentCapabilities.DATA_ANALYSIS, // MultiAgent doesn't have this
      ]);
      const agents = [new MultiAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeUndefined();
    });
  });

  describe('AnyCapabilitySelector', () => {
    it('should select agent with any of the capabilities', () => {
      const selector = new AnyCapabilitySelector([
        AgentCapabilities.SENTIMENT_ANALYSIS,
        AgentCapabilities.DATA_ANALYSIS,
      ]);
      const agents = [new GenericAgent(), new SentimentAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeInstanceOf(SentimentAgent);
    });

    it('should return undefined if no capability matches', () => {
      const selector = new AnyCapabilitySelector([
        AgentCapabilities.DATA_ANALYSIS,
        AgentCapabilities.CODE_GENERATION,
      ]);
      const agents = [new GenericAgent(), new SentimentAgent()];

      const selected = selector.select(agents);

      expect(selected).toBeUndefined();
    });
  });

  describe('FirstAgentSelector', () => {
    it('should select first agent', () => {
      const selector = new FirstAgentSelector();
      const agent1 = new GenericAgent('1');
      const agent2 = new GenericAgent('2');
      const agents = [agent1, agent2];

      const selected = selector.select(agents);

      expect(selected).toBe(agent1);
    });

    it('should return undefined for empty array', () => {
      const selector = new FirstAgentSelector();
      const agents: AIAgent<string, string>[] = [];

      const selected = selector.select(agents);

      expect(selected).toBeUndefined();
    });
  });

  describe('RandomAgentSelector', () => {
    it('should select an agent', () => {
      const selector = new RandomAgentSelector();
      const agents = [new GenericAgent('1'), new GenericAgent('2'), new GenericAgent('3')];

      const selected = selector.select(agents);

      expect(selected).toBeDefined();
      expect(agents).toContain(selected);
    });

    it('should return undefined for empty array', () => {
      const selector = new RandomAgentSelector();
      const agents: AIAgent<string, string>[] = [];

      const selected = selector.select(agents);

      expect(selected).toBeUndefined();
    });

    it('should have some randomness', () => {
      const selector = new RandomAgentSelector();
      const agents = [
        new GenericAgent('1'),
        new GenericAgent('2'),
        new GenericAgent('3'),
        new GenericAgent('4'),
        new GenericAgent('5'),
      ];

      const selections = new Set();
      for (let i = 0; i < 20; i++) {
        const selected = selector.select(agents);
        if (selected) {
          selections.add((selected as GenericAgent)['suffix']);
        }
      }

      // With 5 agents and 20 selections, we should see more than 1 unique selection
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('RoundRobinSelector', () => {
    it('should cycle through agents', () => {
      const selector = new RoundRobinSelector();
      const agent1 = new GenericAgent('1');
      const agent2 = new GenericAgent('2');
      const agent3 = new GenericAgent('3');
      const agents = [agent1, agent2, agent3];

      const selected1 = selector.select(agents);
      const selected2 = selector.select(agents);
      const selected3 = selector.select(agents);
      const selected4 = selector.select(agents); // Should wrap around

      expect(selected1).toBe(agent1);
      expect(selected2).toBe(agent2);
      expect(selected3).toBe(agent3);
      expect(selected4).toBe(agent1); // Wrapped around
    });

    it('should reset', () => {
      const selector = new RoundRobinSelector();
      const agents = [new GenericAgent('1'), new GenericAgent('2')];

      selector.select(agents); // First
      selector.select(agents); // Second
      selector.reset();
      const selected = selector.select(agents); // Should be first again

      expect(selected).toBe(agents[0]);
    });
  });

  describe('PredicateSelector', () => {
    it('should select based on predicate', () => {
      const context = ExecutionContext.create({ sessionId: 'test', environment: 'development' });
      const selector = new PredicateSelector<string, string>(
        (agent) => agent.name.includes('Sentiment')
      );
      const agents = [new GenericAgent(), new SentimentAgent()];

      const selected = selector.select(agents, 'input', context);

      expect(selected).toBeInstanceOf(SentimentAgent);
    });

    it('should have access to input and context', () => {
      const context = ExecutionContext.create({ sessionId: 'special', environment: 'development' });
      let capturedInput: string | undefined;
      let capturedSessionId: string | undefined;

      const selector = new PredicateSelector<string, string>((agent, input, ctx) => {
        capturedInput = input;
        capturedSessionId = ctx.sessionId;
        return true;
      });
      const agents = [new GenericAgent()];

      selector.select(agents, 'test-input', context);

      expect(capturedInput).toBe('test-input');
      expect(capturedSessionId).toBe('special');
    });
  });
});

describe('Delegation', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('delegate', () => {
    it('should delegate to selected agent', async () => {
      const agents = [new GenericAgent(), new SentimentAgent()];
      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);

      const result = await Delegation.delegate(agents, selector, 'input', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });

    it('should throw if no agent found', async () => {
      const agents = [new GenericAgent()];
      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);

      await expect(
        Delegation.delegate(agents, selector, 'input', context)
      ).rejects.toThrow(NoDelegateFoundError);
    });
  });

  describe('delegateByCapability', () => {
    it('should delegate to agent with capability', async () => {
      const agents = [new GenericAgent(), new SentimentAgent()];

      const result = await Delegation.delegateByCapability(
        agents,
        AgentCapabilities.SENTIMENT_ANALYSIS,
        'input',
        context
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });

    it('should throw if no match', async () => {
      const agents = [new GenericAgent()];

      await expect(
        Delegation.delegateByCapability(agents, AgentCapabilities.SENTIMENT_ANALYSIS, 'input', context)
      ).rejects.toThrow(NoDelegateFoundError);
    });
  });

  describe('delegateByCapabilities', () => {
    it('should delegate to agent with all capabilities', async () => {
      const agents = [new SentimentAgent(), new MultiAgent()];

      const result = await Delegation.delegateByCapabilities(
        agents,
        [AgentCapabilities.SUMMARIZATION, AgentCapabilities.TRANSLATION],
        'input',
        context
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Multi: input');
    });
  });

  describe('delegateByAnyCapability', () => {
    it('should delegate to agent with any capability', async () => {
      const agents = [new GenericAgent(), new SentimentAgent()];

      const result = await Delegation.delegateByAnyCapability(
        agents,
        [AgentCapabilities.SENTIMENT_ANALYSIS, AgentCapabilities.DATA_ANALYSIS],
        'input',
        context
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });
  });

  describe('delegateByPredicate', () => {
    it('should delegate using predicate function', async () => {
      const agents = [new GenericAgent(), new SentimentAgent()];

      const result = await Delegation.delegateByPredicate(
        agents,
        (agent) => agent.name.includes('Sentiment'),
        'input',
        context
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });
  });

  describe('tryDelegate', () => {
    it('should return result if agent found', async () => {
      const agents = [new SentimentAgent()];
      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);

      const result = await Delegation.tryDelegate(agents, selector, 'input', context);

      expect(result).toBeDefined();
      expect(result!.isSuccess()).toBe(true);
    });

    it('should return undefined if no agent found', async () => {
      const agents = [new GenericAgent()];
      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);

      const result = await Delegation.tryDelegate(agents, selector, 'input', context);

      expect(result).toBeUndefined();
    });
  });
});

describe('AgentPool', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('construction', () => {
    it('should create empty pool', () => {
      const pool = new AgentPool<string, string>();

      expect(pool.size).toBe(0);
    });
  });

  describe('add', () => {
    it('should add agent', () => {
      const pool = new AgentPool<string, string>();
      const agent = new GenericAgent();

      pool.add(agent);

      expect(pool.size).toBe(1);
    });

    it('should support method chaining', () => {
      const pool = new AgentPool<string, string>();
      const agent = new GenericAgent();

      const result = pool.add(agent);

      expect(result).toBe(pool);
    });
  });

  describe('addAll', () => {
    it('should add multiple agents', () => {
      const pool = new AgentPool<string, string>();
      const agents = [new GenericAgent('1'), new GenericAgent('2')];

      pool.addAll(agents);

      expect(pool.size).toBe(2);
    });
  });

  describe('getAgents', () => {
    it('should return all agents', () => {
      const pool = new AgentPool<string, string>();
      const agent1 = new GenericAgent('1');
      const agent2 = new GenericAgent('2');

      pool.add(agent1).add(agent2);

      const agents = pool.getAgents();

      expect(agents.length).toBe(2);
      expect(agents).toContain(agent1);
      expect(agents).toContain(agent2);
    });

    it('should return frozen array', () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent());

      const agents = pool.getAgents();

      expect(Object.isFrozen(agents)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent('1')).add(new GenericAgent('2'));

      pool.clear();

      expect(pool.size).toBe(0);
    });

    it('should support method chaining', () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent());

      const result = pool.clear();

      expect(result).toBe(pool);
    });
  });

  describe('delegateByCapability', () => {
    it('should delegate to agent with capability', async () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent()).add(new SentimentAgent());

      const result = await pool.delegateByCapability(
        AgentCapabilities.SENTIMENT_ANALYSIS,
        'input',
        context
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });

    it('should throw if no match', async () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent());

      await expect(
        pool.delegateByCapability(AgentCapabilities.SENTIMENT_ANALYSIS, 'input', context)
      ).rejects.toThrow(NoDelegateFoundError);
    });
  });

  describe('delegateRoundRobin', () => {
    it('should cycle through agents', async () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent('1')).add(new GenericAgent('2')).add(new GenericAgent('3'));

      const result1 = await pool.delegateRoundRobin('input', context);
      const result2 = await pool.delegateRoundRobin('input', context);
      const result3 = await pool.delegateRoundRobin('input', context);
      const result4 = await pool.delegateRoundRobin('input', context); // Wraps around

      expect(result1.value).toBe('Generic1: input');
      expect(result2.value).toBe('Generic2: input');
      expect(result3.value).toBe('Generic3: input');
      expect(result4.value).toBe('Generic1: input'); // Wrapped
    });

    it('should throw if pool is empty', async () => {
      const pool = new AgentPool<string, string>();

      await expect(pool.delegateRoundRobin('input', context)).rejects.toThrow(
        NoDelegateFoundError
      );
    });
  });

  describe('delegateRandom', () => {
    it('should delegate to random agent', async () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent('1')).add(new GenericAgent('2')).add(new GenericAgent('3'));

      const result = await pool.delegateRandom('input', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toMatch(/^Generic[123]: input$/);
    });

    it('should throw if pool is empty', async () => {
      const pool = new AgentPool<string, string>();

      await expect(pool.delegateRandom('input', context)).rejects.toThrow(
        NoDelegateFoundError
      );
    });
  });

  describe('delegate', () => {
    it('should delegate using custom selector', async () => {
      const pool = new AgentPool<string, string>();
      pool.add(new GenericAgent()).add(new SentimentAgent());

      const selector = new CapabilitySelector(AgentCapabilities.SENTIMENT_ANALYSIS);
      const result = await pool.delegate(selector, 'input', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('Sentiment: input');
    });
  });
});
