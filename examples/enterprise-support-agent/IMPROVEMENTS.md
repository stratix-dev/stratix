# Stratix Framework - Mejoras Propuestas

Este documento analiza el estado actual del framework Stratix y propone mejoras concretas para mejorar la experiencia del desarrollador (DX) y reducir el código boilerplate.

## Tabla de Contenidos

1. [Estado Actual: Análisis de Boilerplate](#estado-actual-análisis-de-boilerplate)
2. [Mejoras Propuestas](#mejoras-propuestas)
3. [Ejemplos de Código: Antes vs Después](#ejemplos-de-código-antes-vs-después)
4. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Estado Actual: Análisis de Boilerplate

### Problemas Identificados

#### 1. Creación Manual de Contextos (Mucho Boilerplate)

**Código Actual (87 líneas):**
```typescript
export class EnterpriseSupportContext implements Context {
  readonly metadata: ContextMetadata = {
    name: 'enterprise-support-context',
    version: '2.0.0',
    description: 'Enterprise support',
  };

  private agent: EnterpriseSupportAgent;
  private toolRegistry: InMemoryToolRegistry;
  private ticketRepository: InMemoryTicketRepository;
  private supportRequestHandler: HandleSupportRequestHandler;
  // ... más propiedades

  constructor(llmProvider: LLMProvider) {
    // Crear registry
    this.toolRegistry = new InMemoryToolRegistry();

    // Crear tools
    this.knowledgeBaseTool = new QueryKnowledgeBaseTool();
    this.orderStatusTool = new CheckOrderStatusTool();
    this.createTicketTool = new CreateSupportTicketTool();

    // Registrar tools uno por uno
    this.toolRegistry.register(this.knowledgeBaseTool);
    this.toolRegistry.register(this.orderStatusTool);
    this.toolRegistry.register(this.createTicketTool);

    // Crear agente
    this.agent = new EnterpriseSupportAgent(/*...*/);

    // Crear repositorios
    this.ticketRepository = new InMemoryTicketRepository();

    // Crear handlers
    this.supportRequestHandler = new HandleSupportRequestHandler(this.agent);
    // ... más handlers
  }

  getCommands(): ContextCommandDefinition[] {
    return [
      {
        name: 'HandleSupportRequest',
        commandType: {} as new () => HandleSupportRequestCommand,
        handler: this.supportRequestHandler,
      },
    ];
  }

  getQueries(): ContextQueryDefinition[] {
    return [/* ... */];
  }

  // 10+ métodos getter
  getAgent() { return this.agent; }
  getToolRegistry() { return this.toolRegistry; }
  // ...
}
```

**Problemas:**
- Demasiado código manual
- Fácil olvidar registrar algo
- Difícil de mantener
- No hay auto-discovery
- Repetitivo

#### 2. Creación de Commands/Queries (Repetitivo)

**Código Actual:**
```typescript
// Definir interfaz
export interface HandleSupportRequestCommand extends Command {
  readonly request: SupportRequest;
}

// Crear handler (archivo separado)
export class HandleSupportRequestHandler
  implements CommandHandler<HandleSupportRequestCommand, Result<SupportResponse, Error>>
{
  constructor(private readonly agent: EnterpriseSupportAgent) {}

  async handle(
    command: HandleSupportRequestCommand
  ): Promise<Result<SupportResponse, Error>> {
    try {
      const agentResult = await this.agent.executeWithEvents(command.request);
      if (agentResult.isSuccess()) {
        return Success.create(agentResult.data);
      } else {
        return Failure.create(agentResult.error || new Error('Agent execution failed'));
      }
    } catch (error) {
      return Failure.create(new Error(`Failed to handle support request: ${(error as Error).message}`));
    }
  }
}
```

**Problemas:**
- Mucho boilerplate para cada comando
- Patrón de conversión AgentResult → Result es repetitivo
- 2 archivos por comando (interface + handler)

#### 3. Creación de Tools (Verbose)

**Código Actual (147 líneas por tool):**
```typescript
export class QueryKnowledgeBaseTool extends AgentTool<Input, Output> {
  readonly name = 'query_knowledge_base';
  readonly description = 'Search the knowledge base';
  readonly requiresApproval = false;

  async execute(input: Input): Promise<Output> {
    // Implementación
  }

  async validate(input: unknown): Promise<Input> {
    // Validación manual completa
    if (typeof input !== 'object' || input === null) {
      throw new Error('Input must be an object');
    }
    // ... más validación
  }

  getDefinition(): ToolDefinition {
    // Definición manual de schema
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
          // ... más propiedades
        },
        required: ['query'],
      },
    };
  }
}
```

**Problemas:**
- Duplicación entre tipos TypeScript y JSON schema
- Validación manual propensa a errores
- No hay inferencia de tipos

#### 4. Configuración de Agentes (Complejo)

**Código Actual:**
```typescript
export class EnterpriseSupportAgent extends AIAgent<SupportRequest, SupportResponse> {
  readonly name = 'Enterprise Support Agent';
  readonly description = 'Advanced AI agent';
  readonly version = AgentVersionFactory.create('2.0.0');
  readonly capabilities: AgentCapability[] = [
    AgentCapabilities.CUSTOMER_SUPPORT,
    AgentCapabilities.SENTIMENT_ANALYSIS,
    'knowledge_retrieval',
    'ticket_management',
    'order_tracking',
    'multilingual_support',
    'escalation_management',
  ];
  readonly model: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
  };

  constructor(
    id: EntityId<'AIAgent'>,
    createdAt: Date,
    updatedAt: Date,
    private readonly llmProvider: LLMProvider,
    private readonly toolRegistry?: ToolRegistry
  ) {
    super(id, createdAt, updatedAt);
  }

  protected async execute(input: SupportRequest): Promise<AgentResult<SupportResponse>> {
    // 100+ líneas de lógica
  }
}
```

**Problemas:**
- Mucha configuración manual
- Lógica de execute mezclada con configuración
- Difícil extraer y reutilizar patrones comunes

---

## Mejoras Propuestas

### 1. Auto-Discovery con Decoradores (Inspirado en NestJS)

#### Propuesta: Decoradores para reducir boilerplate dramáticamente

**Beneficios:**
- Menos código (reducción del 60-70%)
- Auto-discovery de tools, commands, queries
- Type-safe por defecto
- Más expresivo y declarativo

**Implementación:**

```typescript
// packages/core/src/decorators/index.ts

// Decorador para contextos
export function BoundedContext(metadata: {
  name: string;
  version: string;
  description: string;
}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    // Registrar metadata en un registry global
    Reflect.defineMetadata('context:metadata', metadata, constructor);
    return constructor;
  };
}

// Decorador para tools
export function Tool(options?: {
  description?: string;
  requiresApproval?: boolean;
  category?: string;
}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    Reflect.defineMetadata('tool:options', options, constructor);
    return constructor;
  };
}

// Decorador para validación automática con Zod
export function ValidateWith(schema: z.ZodSchema) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const validated = await schema.parseAsync(args[0]);
      return originalMethod.call(this, validated);
    };
  };
}

// Decorador para commands
export function Command(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata('command:name', name || propertyKey, target, propertyKey);
  };
}

// Decorador para queries
export function Query(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata('query:name', name || propertyKey, target, propertyKey);
  };
}
```

**Ejemplo de Uso:**

```typescript
// ANTES: 147 líneas
export class QueryKnowledgeBaseTool extends AgentTool<Input, Output> {
  readonly name = 'query_knowledge_base';
  // ... todo el boilerplate
}

// DESPUÉS: 25 líneas
import { z } from 'zod';

const KBQuerySchema = z.object({
  query: z.string().min(1).describe('Search query for knowledge base'),
  category: z.enum(['billing', 'technical', 'shipping', 'product', 'account', 'general']).optional(),
  limit: z.number().min(1).max(10).default(3),
});

@Tool({
  description: 'Search the knowledge base for relevant articles',
  category: 'knowledge',
})
export class QueryKnowledgeBaseTool {
  @ValidateWith(KBQuerySchema)
  async execute(input: z.infer<typeof KBQuerySchema>) {
    // Solo la lógica de negocio
    const results = await this.searchKB(input.query, input.category);
    return {
      articles: results.slice(0, input.limit),
      totalFound: results.length,
    };
  }

  private async searchKB(query: string, category?: string) {
    // Implementación
  }
}
```

**Reducción:** 147 líneas → 25 líneas (83% menos código)

### 2. Context Builder Fluido

#### Propuesta: Builder pattern para contextos

**Antes:**
```typescript
export class EnterpriseSupportContext implements Context {
  // 87 líneas de boilerplate
}
```

**Después:**
```typescript
import { ContextBuilder } from '@stratix/core';

@BoundedContext({
  name: 'enterprise-support',
  version: '2.0.0',
  description: 'Enterprise customer support',
})
export class EnterpriseSupportContext {
  static create(llmProvider: LLMProvider) {
    return new ContextBuilder()
      .withName('enterprise-support')
      .withVersion('2.0.0')

      // Auto-discover tools en el directorio
      .autoDiscoverTools('./infrastructure/tools')

      // O registrar manualmente
      .withTools([
        QueryKnowledgeBaseTool,
        CheckOrderStatusTool,
        CreateSupportTicketTool,
      ])

      // Auto-discover commands/queries
      .autoDiscoverHandlers('./application')

      // Registrar agente
      .withAgent(EnterpriseSupportAgent, { llmProvider })

      // Auto-wire repositories
      .withRepositories([
        { provide: TicketRepository, useClass: InMemoryTicketRepository },
      ])

      .build();
  }
}
```

**Reducción:** 87 líneas → 25 líneas (71% menos código)

### 3. Command/Query Simplificados

#### Propuesta: Decoradores + convención sobre configuración

**Antes:**
```typescript
// Interface separada
export interface HandleSupportRequestCommand extends Command {
  readonly request: SupportRequest;
}

// Handler separado (40 líneas)
export class HandleSupportRequestHandler
  implements CommandHandler<HandleSupportRequestCommand, Result<SupportResponse, Error>>
{
  constructor(private readonly agent: EnterpriseSupportAgent) {}

  async handle(command: HandleSupportRequestCommand): Promise<Result<SupportResponse, Error>> {
    try {
      const agentResult = await this.agent.executeWithEvents(command.request);
      if (agentResult.isSuccess()) {
        return Success.create(agentResult.data);
      } else {
        return Failure.create(agentResult.error || new Error('Failed'));
      }
    } catch (error) {
      return Failure.create(new Error(`Failed: ${error.message}`));
    }
  }
}
```

**Después:**
```typescript
import { CommandHandler, InjectAgent } from '@stratix/core';

export class SupportRequestHandlers {
  constructor(
    @InjectAgent() private agent: EnterpriseSupportAgent
  ) {}

  @Command()
  async handleSupportRequest(
    request: SupportRequest
  ): Promise<Result<SupportResponse, Error>> {
    // Conversión automática de AgentResult → Result
    return this.agent.executeWithEvents(request);
  }

  @Query()
  async getCustomerTickets(
    customerId: string,
    options?: { limit?: number; status?: TicketStatus }
  ): Promise<Result<SupportTicket[], Error>> {
    return this.ticketRepo.findByCustomerId(customerId, options);
  }
}
```

**Reducción:** 2 archivos, 60 líneas → 1 archivo, 20 líneas (67% menos código)

### 4. Agente Configurado por Convención

#### Propuesta: Configuración declarativa + defaults inteligentes

**Antes:**
```typescript
export class EnterpriseSupportAgent extends AIAgent<SupportRequest, SupportResponse> {
  readonly name = 'Enterprise Support Agent';
  readonly description = 'Advanced AI agent';
  readonly version = AgentVersionFactory.create('2.0.0');
  readonly capabilities = [/* ... */];
  readonly model = {/* ... */};

  constructor(/* ... */) {
    super(id, createdAt, updatedAt);
  }

  protected async execute(input: SupportRequest): Promise<AgentResult<SupportResponse>> {
    // 150 líneas de lógica
  }
}
```

**Después:**
```typescript
import { Agent, UseTools, UsePrompt, ResponseFormat } from '@stratix/core';

@Agent({
  name: 'Enterprise Support Agent',
  version: '2.0.0',
  capabilities: ['customer_support', 'sentiment_analysis', 'multilingual'],
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
  },
})
@UseTools([
  QueryKnowledgeBaseTool,
  CheckOrderStatusTool,
  CreateSupportTicketTool,
])
@UsePrompt('./prompts/enterprise-support.md') // Prompt externo
@ResponseFormat(SupportResponseSchema) // Zod schema automático
export class EnterpriseSupportAgent {
  // El método execute se genera automáticamente
  // basado en el prompt, tools, y response format

  // Solo implementas hooks si necesitas custom logic
  async beforeExecution?(input: SupportRequest): Promise<void> {
    // Optional: Pre-processing
  }

  async afterExecution?(
    input: SupportRequest,
    result: SupportResponse
  ): Promise<SupportResponse> {
    // Optional: Post-processing
    return result;
  }
}
```

**Reducción:** 200 líneas → 30 líneas (85% menos código)

### 5. Schema-First con Generación de Código

#### Propuesta: Definir schema en YAML/JSON y generar código

**Archivo: agent.schema.yaml**
```yaml
name: enterprise-support
version: 2.0.0
description: Enterprise customer support agent

agent:
  name: Enterprise Support Agent
  model:
    provider: openai
    model: gpt-4o
    temperature: 0.7
    maxTokens: 2000

  capabilities:
    - customer_support
    - sentiment_analysis
    - multilingual

  prompt: ./prompts/enterprise-support.md

  input:
    type: object
    properties:
      customerId:
        type: string
        description: Customer ID
      message:
        type: string
        description: Customer message
      metadata:
        $ref: '#/components/schemas/CustomerMetadata'

  output:
    type: object
    properties:
      message:
        type: string
      sentiment:
        $ref: '#/components/schemas/Sentiment'
      category:
        type: string
        enum: [billing, technical, shipping, product, account, general]

tools:
  - name: query_knowledge_base
    description: Search knowledge base
    file: ./tools/QueryKnowledgeBaseTool.ts

  - name: check_order_status
    description: Check order status
    file: ./tools/CheckOrderStatusTool.ts

commands:
  - name: HandleSupportRequest
    handler: SupportRequestHandlers.handleSupportRequest

queries:
  - name: GetCustomerTickets
    handler: SupportRequestHandlers.getCustomerTickets

repositories:
  - interface: TicketRepository
    implementation: InMemoryTicketRepository
```

**Comando de generación:**
```bash
stratix generate --schema agent.schema.yaml --output ./generated
```

**Genera automáticamente:**
- TypeScript types
- Context class
- Agent class
- Handler registrations
- Repository bindings

### 6. Hot Reload de Prompts

#### Propuesta: Prompts como archivos externos con hot reload

**Archivo: prompts/enterprise-support.md**
```markdown
# Enterprise Support Agent

You are an expert customer support agent for {{company_name}}.

## Your Capabilities
{{#each tools}}
- {{this.name}}: {{this.description}}
{{/each}}

## Response Format
Respond with JSON matching this structure:
{{response_schema}}

## Guidelines
1. Always be professional and empathetic
2. Use tools proactively to gather information
3. Analyze sentiment to detect urgency
4. Escalate when: {{escalation_rules}}

## Priority Levels
- critical: {{priority.critical}}
- high: {{priority.high}}
- medium: {{priority.medium}}
- low: {{priority.low}}
```

**Uso:**
```typescript
@Agent({
  prompt: './prompts/enterprise-support.md',
  promptVariables: {
    company_name: 'Acme Corp',
    escalation_rules: 'negative sentiment OR explicit request OR 3+ failed attempts',
    priority: {
      critical: 'System down, data loss, security issues',
      high: 'Service disruption, payment issues',
      medium: 'Feature requests, minor bugs',
      low: 'Information requests',
    },
  },
})
export class EnterpriseSupportAgent {}
```

**En desarrollo:**
```bash
stratix dev --watch-prompts
```
- Cambios en prompts se recargan automáticamente
- No necesitas recompilar
- Iteración rápida

### 7. Testing Helpers Mejorados

#### Propuesta: Test builders y factories

**Antes:**
```typescript
describe('EnterpriseSupportAgent', () => {
  let context: EnterpriseSupportContext;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    mockProvider.addMockResponse({
      content: JSON.stringify({/* ... */}),
      usage: {/* ... */},
    });
    context = new EnterpriseSupportContext(mockProvider);
  });

  it('should handle request', async () => {
    const command: HandleSupportRequestCommand = {
      request: {
        customerId: 'test-001',
        message: 'Help me',
        metadata: {
          accountAge: 30,
          previousTickets: 0,
          customerTier: 'free',
        },
      },
    };

    const result = await context.getSupportRequestHandler().handle(command);

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.category).toBe('technical');
    }
  });
});
```

**Después:**
```typescript
import { AgentTester, MockBuilder } from '@stratix/testing';

describe('EnterpriseSupportAgent', () => {
  const tester = AgentTester.for(EnterpriseSupportAgent)
    .withMockProvider()
    .withTools([QueryKnowledgeBaseTool, CheckOrderStatusTool])
    .build();

  it('should handle request', async () => {
    await tester
      .given(
        MockBuilder.supportRequest()
          .fromCustomer('test-001')
          .withMessage('Help me')
          .withTier('free')
          .build()
      )
      .expect
      .category('technical')
      .priority('medium')
      .escalation(false)
      .verify();
  });

  it('should escalate on negative sentiment', async () => {
    await tester
      .given(
        MockBuilder.supportRequest()
          .withMessage('This is terrible! I want my money back!')
          .build()
      )
      .mockToolResponse('query_knowledge_base', {
        articles: [{ id: 'kb-001', title: 'Refund Policy' }],
      })
      .expect
      .sentiment('negative')
      .escalation(true)
      .toolCalled('query_knowledge_base')
      .verify();
  });
});
```

**Reducción:** 40 líneas → 15 líneas (62% menos código)

### 8. CLI Mejorado

#### Propuesta: CLI para scaffolding y desarrollo

```bash
# Crear nuevo contexto
stratix new context enterprise-support

# Generar tool
stratix generate tool QueryKnowledgeBase --category knowledge

# Generar command
stratix generate command HandleSupportRequest

# Generar query
stratix generate query GetCustomerTickets

# Generar agente completo desde template
stratix generate agent --template customer-support

# Modo desarrollo con hot reload
stratix dev --watch --port 3000

# Generar tipos desde schema
stratix codegen --schema agent.schema.yaml

# Validar contexto
stratix validate ./src/contexts/EnterpriseSupport

# Ejecutar tests
stratix test --coverage

# Build optimizado
stratix build --production
```

### 9. Type-Safe Configuration

#### Propuesta: Configuración type-safe con Zod

**Antes:**
```typescript
const config = {
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
  },
};
```

**Después:**
```typescript
import { z } from 'zod';
import { defineConfig } from '@stratix/core';

const AgentConfig = z.object({
  model: z.object({
    provider: z.enum(['openai', 'anthropic']),
    model: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().positive(),
  }),
  tools: z.array(z.string()),
  capabilities: z.array(z.string()),
});

export default defineConfig({
  agent: {
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
    },
    tools: ['query_knowledge_base', 'check_order_status'],
    capabilities: ['customer_support', 'sentiment_analysis'],
  },
});

// Type inference automático
type Config = z.infer<typeof AgentConfig>;
```

### 10. Observability Built-in

#### Propuesta: Telemetría y logging automáticos

```typescript
@Agent({
  name: 'Enterprise Support',
  telemetry: {
    enabled: true,
    exporters: ['console', 'prometheus'],
    trackTokenUsage: true,
    trackCosts: true,
    trackLatency: true,
  },
  logging: {
    level: 'info',
    format: 'json',
    destinations: ['console', 'file'],
  },
})
export class EnterpriseSupportAgent {
  @Trace() // Auto-tracing
  async execute(input: SupportRequest) {
    // Automatically tracked:
    // - Duration
    // - Token usage
    // - Cost
    // - Tool calls
    // - Errors
  }
}
```

**Dashboard automático:**
```bash
stratix dashboard
# Abre dashboard en http://localhost:3001
# Muestra:
# - Requests por segundo
# - Latencia p50, p95, p99
# - Costo por request
# - Token usage
# - Error rate
# - Tool usage statistics
```

---

## Ejemplos de Código: Antes vs Después

### Ejemplo Completo: Agente de Soporte

#### ANTES (Total: ~500 líneas)

**EnterpriseSupportContext.ts (87 líneas)**
```typescript
export class EnterpriseSupportContext implements Context {
  readonly metadata: ContextMetadata = {/*...*/};
  private agent: EnterpriseSupportAgent;
  private toolRegistry: InMemoryToolRegistry;
  // ... 10+ propiedades

  constructor(llmProvider: LLMProvider) {
    // Manual setup de todo
  }

  getCommands() {/*...*/}
  getQueries() {/*...*/}
  // ... 10+ getters
}
```

**EnterpriseAgent.ts (305 líneas)**
```typescript
export class EnterpriseSupportAgent extends AIAgent<SupportRequest, SupportResponse> {
  readonly name = 'Enterprise Support Agent';
  readonly description = '...';
  readonly version = AgentVersionFactory.create('2.0.0');
  readonly capabilities = [/*...*/];
  readonly model = {/*...*/};

  protected async execute(input: SupportRequest): Promise<AgentResult<SupportResponse>> {
    // 150+ líneas de lógica
  }

  private buildSystemPrompt(): string {
    return `Long hardcoded prompt...`;
  }

  // ... más métodos
}
```

**HandleSupportRequest.ts (39 líneas)**
```typescript
export interface HandleSupportRequestCommand extends Command {
  readonly request: SupportRequest;
}

export class HandleSupportRequestHandler
  implements CommandHandler<HandleSupportRequestCommand, Result<SupportResponse, Error>>
{
  constructor(private readonly agent: EnterpriseSupportAgent) {}

  async handle(command: HandleSupportRequestCommand): Promise<Result<SupportResponse, Error>> {
    // Boilerplate de conversión
  }
}
```

**QueryKnowledgeBaseTool.ts (147 líneas)**
```typescript
export class QueryKnowledgeBaseTool extends AgentTool<Input, Output> {
  readonly name = 'query_knowledge_base';
  readonly description = '...';

  async execute(input: Input): Promise<Output> {/*...*/}
  async validate(input: unknown): Promise<Input> {
    // Validación manual
  }
  getDefinition(): ToolDefinition {
    // Schema manual
  }
}
```

**Total: ~500 líneas + configuración manual**

#### DESPUÉS (Total: ~120 líneas)

**enterprise-support.config.ts (30 líneas)**
```typescript
import { defineConfig } from '@stratix/core';

export default defineConfig({
  context: {
    name: 'enterprise-support',
    version: '2.0.0',
  },

  agent: {
    name: 'Enterprise Support Agent',
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
    },
    prompt: './prompts/system.md',
  },

  tools: {
    autoDiscover: './tools',
  },

  handlers: {
    autoDiscover: './handlers',
  },
});
```

**EnterpriseSupportAgent.ts (25 líneas)**
```typescript
import { Agent, UseTools, UsePrompt } from '@stratix/core';

@Agent(config.agent)
@UseTools([
  QueryKnowledgeBaseTool,
  CheckOrderStatusTool,
  CreateSupportTicketTool,
])
@UsePrompt('./prompts/system.md')
export class EnterpriseSupportAgent {
  // Hooks opcionales
  async beforeExecution(input: SupportRequest) {
    // Custom logic si es necesario
  }
}
```

**SupportHandlers.ts (20 líneas)**
```typescript
export class SupportHandlers {
  @Command()
  async handleSupportRequest(request: SupportRequest) {
    return this.agent.execute(request);
  }

  @Query()
  async getCustomerTickets(customerId: string, options?: any) {
    return this.ticketRepo.findByCustomerId(customerId, options);
  }
}
```

**QueryKnowledgeBaseTool.ts (25 líneas)**
```typescript
const KBQuerySchema = z.object({
  query: z.string().min(1),
  category: z.enum(['billing', 'technical', /*...*/]).optional(),
  limit: z.number().min(1).max(10).default(3),
});

@Tool({ description: 'Search knowledge base' })
export class QueryKnowledgeBaseTool {
  @ValidateWith(KBQuerySchema)
  async execute(input: z.infer<typeof KBQuerySchema>) {
    return this.searchKB(input);
  }

  private searchKB(input: any) {
    // Solo lógica de negocio
  }
}
```

**prompts/system.md (20 líneas)**
```markdown
You are an expert customer support agent.

## Tools Available
{{#each tools}}
- {{name}}: {{description}}
{{/each}}

## Response Format
{{response_schema}}

## Guidelines
1. Be professional and empathetic
2. Use tools proactively
3. Escalate when needed
```

**Total: ~120 líneas**
**Reducción: 76% menos código (500 → 120 líneas)**

---

## Roadmap de Implementación

### Fase 1: Fundamentos (2-3 semanas)

**Objetivo:** Infraestructura base para mejoras

1. **Decoradores Base**
   - `@BoundedContext`
   - `@Tool`
   - `@Agent`
   - `@Command`
   - `@Query`

2. **Metadata Registry**
   - Sistema de reflection
   - Registry global para decoradores
   - Auto-discovery engine

3. **Validación con Zod**
   - `@ValidateWith` decorator
   - Integración Zod → JSON Schema
   - Type inference automático

**Entregables:**
- `@stratix/decorators` package
- `@stratix/reflection` package
- Documentación de decoradores

### Fase 2: Builders y Auto-Discovery (2-3 semanas)

**Objetivo:** Reducir boilerplate de contextos

1. **ContextBuilder**
   - Fluent API
   - Auto-discovery de tools
   - Auto-discovery de handlers
   - Repository auto-wiring

2. **AgentBuilder**
   - Configuración declarativa
   - Prompt loading externo
   - Tool registration simplificado

3. **CLI Básico**
   - `stratix new context`
   - `stratix generate tool`
   - `stratix generate command/query`

**Entregables:**
- `ContextBuilder` API
- `AgentBuilder` API
- `@stratix/cli` package (v1)

### Fase 3: Schema-First y Generación (3-4 semanas)

**Objetivo:** Generación de código desde schemas

1. **Schema Definition**
   - YAML/JSON schema format
   - Validación de schemas
   - Parser y validator

2. **Code Generator**
   - Generación de tipos TypeScript
   - Generación de contexts
   - Generación de agents
   - Generación de tools skeleton

3. **CLI Avanzado**
   - `stratix codegen`
   - `stratix validate`
   - Template system

**Entregables:**
- `@stratix/codegen` package
- Schema specification
- Templates library
- Documentación de codegen

### Fase 4: Developer Experience (2-3 semanas)

**Objetivo:** Mejorar experiencia de desarrollo

1. **Hot Reload**
   - Watch mode para prompts
   - Watch mode para configuración
   - Dev server con live reload

2. **Testing Helpers**
   - `AgentTester` API
   - `MockBuilder` fluido
   - Test factories

3. **CLI Completo**
   - `stratix dev --watch`
   - `stratix test`
   - `stratix build`
   - `stratix dashboard`

**Entregables:**
- `@stratix/testing` v2
- Dev server
- CLI completo
- Developer guide

### Fase 5: Observability (2 semanas)

**Objetivo:** Telemetría y monitoring built-in

1. **Telemetry Integration**
   - `@Trace` decorator
   - Automatic metrics
   - OpenTelemetry integration

2. **Dashboard**
   - Real-time metrics
   - Cost tracking
   - Performance monitoring
   - Error tracking

3. **Logging**
   - Structured logging
   - Log aggregation
   - Debug mode

**Entregables:**
- `@stratix/telemetry` package
- Dashboard UI
- Monitoring guide

### Fase 6: Refinamiento (1-2 semanas)

**Objetivo:** Pulir y documentar

1. **Documentación**
   - Guías de migración
   - Best practices
   - Recipes y ejemplos

2. **Performance**
   - Optimizaciones
   - Benchmarks
   - Lazy loading

3. **Testing**
   - Tests comprehensivos
   - Integration tests
   - E2E tests

**Entregables:**
- Documentación completa
- Migration guide
- Performance benchmarks

---

## Métricas de Éxito

### Reducción de Código

| Componente | Antes | Después | Reducción |
|------------|-------|---------|-----------|
| Context | 87 líneas | 30 líneas | 66% |
| Agent | 305 líneas | 25 líneas | 92% |
| Command Handler | 39 líneas | 15 líneas | 62% |
| Tool | 147 líneas | 25 líneas | 83% |
| **Total Ejemplo** | **~500 líneas** | **~120 líneas** | **76%** |

### Tiempo de Desarrollo

| Tarea | Antes | Después | Mejora |
|-------|-------|---------|---------|
| Crear nuevo contexto | 2-3 horas | 15 minutos | 88% |
| Agregar nuevo tool | 45 minutos | 10 minutos | 78% |
| Agregar command/query | 30 minutos | 5 minutos | 83% |
| Escribir tests | 1 hora | 20 minutos | 67% |

### Developer Experience

- **Time to First Agent:** 3 horas → 30 minutos
- **Lines of Boilerplate:** 500 líneas → 120 líneas
- **Concepts to Learn:** 15+ → 8
- **Files to Create:** 10+ → 4
- **Configuration Complexity:** Alta → Baja

---

## Comparación con Otros Frameworks

### Stratix (Propuesto) vs Competitors

| Feature | Stratix (Actual) | Stratix (Propuesto) | LangChain | AutoGen | CrewAI |
|---------|------------------|---------------------|-----------|----------|---------|
| Type Safety | ✅ Fuerte | ✅ Muy Fuerte | ❌ Débil | ⚠️ Media | ❌ Débil |
| Boilerplate | ⚠️ Alto | ✅ Mínimo | ⚠️ Alto | ⚠️ Medio | ✅ Bajo |
| Auto-Discovery | ❌ No | ✅ Sí | ❌ No | ❌ No | ❌ No |
| DDD/CQRS | ✅ Sí | ✅ Sí | ❌ No | ❌ No | ❌ No |
| Decorators | ❌ No | ✅ Sí | ❌ No | ❌ No | ❌ No |
| Code Gen | ❌ No | ✅ Sí | ❌ No | ❌ No | ❌ No |
| Hot Reload | ❌ No | ✅ Sí | ❌ No | ❌ No | ⚠️ Parcial |
| CLI | ❌ No | ✅ Completo | ⚠️ Básico | ❌ No | ❌ No |
| Testing | ⚠️ Básico | ✅ Avanzado | ⚠️ Básico | ⚠️ Básico | ⚠️ Básico |
| Dashboard | ❌ No | ✅ Sí | ⚠️ LangSmith | ❌ No | ❌ No |

**Ventaja Competitiva:**
- Type-safety de clase empresarial
- DDD/CQRS patterns
- Mínimo boilerplate (mejor que todos)
- Developer experience superior

---

## Consideraciones de Diseño

### 1. Backward Compatibility

**Estrategia:**
- Mantener API actual como "classic mode"
- Nuevas features opt-in con decoradores
- Migration path claro
- Deprecated warnings progresivos

```typescript
// Opción 1: Classic (sigue funcionando)
export class MyContext implements Context {
  // Código actual sin cambios
}

// Opción 2: Modern (recomendado para nuevos proyectos)
@BoundedContext({ name: 'my-context' })
export class MyContext {
  // Menos boilerplate
}
```

### 2. Learning Curve

**Mitigación:**
- Documentación progresiva (básico → avanzado)
- Templates para casos comunes
- CLI interactivo con wizards
- Video tutorials
- Migration guides

### 3. Performance

**Optimizaciones:**
- Lazy loading de decoradores
- Compilation cache
- Tree-shaking agresivo
- Build-time code generation
- Runtime metadata caching

### 4. Debugging

**Herramientas:**
- Source maps para código generado
- Debug mode verbose
- Inspector de metadata
- Validation errors claros
- Stack traces mejorados

---

## Conclusión

Las mejoras propuestas transformarían Stratix en el framework más developer-friendly para AI agents sin sacrificar su arquitectura enterprise-grade.

### Beneficios Clave

1. **76% menos código** en casos típicos
2. **88% menos tiempo** para crear nuevos contextos
3. **Type-safety mejorado** con Zod + TypeScript
4. **Developer experience** superior a competidores
5. **Mantiene** arquitectura DDD/CQRS/Hexagonal

### Siguiente Paso

Recomiendo empezar con **Fase 1** (Decoradores Base) como MVP para validar el approach con la comunidad.

¿Implementamos un prototipo de decoradores básicos primero?
