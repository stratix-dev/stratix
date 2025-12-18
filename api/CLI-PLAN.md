# 📋 Plan CLI de Stratix (`@stratix/cli`)

> Planificación para la CLI básica del framework Stratix

## 📦 Paquetes Disponibles

| Paquete | Nombre npm | Tipo |
|---------|------------|------|
| Core | `@stratix/core` | Core |
| Runtime | `@stratix/runtime` | Core |
| Testing | `@stratix/testing` | Core |
| DI (Awilix) | `@stratix/di` | Provider |
| Validation (Zod) | `@stratix/validation-zod` | Provider |
| Config Env | `@stratix/config-env` | Provider |
| Config File | `@stratix/config-file` | Provider |
| Config Composite | `@stratix/config-composite` | Provider |
| AI OpenAI | `@stratix/ai-openai` | AI Provider |
| AI Anthropic | `@stratix/ai-anthropic` | AI Provider |

---

## 🏗️ Comandos

### 1. `stratix new <project-name>` - Crear proyecto

**¿Qué debe hacer?**
- Crear estructura de carpetas DDD
- Generar `package.json` con dependencias base (`@stratix/core`, `@stratix/runtime`, `@stratix/di`)
- Crear `tsconfig.json` con strict mode y ESM
- Generar `src/index.ts` con `ApplicationBuilder`
- Configurar ESLint y Prettier

**Opciones:**

| Flag | Descripción |
|------|-------------|
| `--with-validation` | Agregar `@stratix/validation-zod` |
| `--with-config` | Agregar `@stratix/config-env` |
| `--with-ai openai` | Agregar `@stratix/ai-openai` |
| `--with-ai anthropic` | Agregar `@stratix/ai-anthropic` |

**Resultado esperado:**

```
my-app/
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── src/
│   ├── index.ts
│   └── contexts/
│       └── .gitkeep
└── README.md
```

**Contenido de `src/index.ts`:**

```typescript
import { ApplicationBuilder, ConsoleLogger, createContainer } from '@stratix/runtime';

const container = createContainer();
const logger = new ConsoleLogger({ level: 'info' });

const app = await ApplicationBuilder.create()
  .useContainer(container)
  .useLogger(logger)
  .build();

await app.start();
console.log('Application started!');
```

---

### 2. `stratix generate context <name>` - Generar bounded context

**¿Qué debe hacer?**
- Crear estructura completa con archivos de **ejemplo User**
- Sin opciones de propiedades (siempre genera ejemplo fijo)
- Contexto listo para modificar/renombrar

**Sin opciones** - Solo el nombre del contexto.

**Resultado esperado para `stratix generate context Product`:**

```
src/contexts/Product/
├── ProductContext.ts
├── domain/
│   ├── entities/
│   │   └── User.ts                    # Ejemplo: Entity con props básicas
│   ├── value-objects/
│   │   └── Email.ts                   # Ejemplo: ValueObject simple
│   └── events/
│       └── UserCreated.ts             # Ejemplo: Domain event
├── application/
│   ├── commands/
│   │   ├── CreateUser.ts              # Ejemplo: Command
│   │   └── CreateUserHandler.ts       # Ejemplo: Handler
│   └── queries/
│       ├── GetUserById.ts             # Ejemplo: Query
│       └── GetUserByIdHandler.ts      # Ejemplo: Handler
└── infrastructure/
    └── repositories/
        └── InMemoryUserRepository.ts  # Ejemplo: Repository
```

**Contenido de archivos de ejemplo:**

```typescript
// domain/entities/User.ts
import { Entity, EntityId, Success, Failure, DomainError } from '@stratix/core';
import type { Result } from '@stratix/core';

export type UserId = EntityId<'User'>;

export interface UserProps {
  name: string;
  email: string;
}

export class User extends Entity<UserId, UserProps> {
  get name(): string { return this.props.name; }
  get email(): string { return this.props.email; }

  static create(props: UserProps): Result<User, DomainError> {
    if (!props.name) {
      return Failure(new DomainError('Name is required'));
    }
    return Success(new User(EntityId.create<'User'>(), props));
  }
}
```

```typescript
// ProductContext.ts
import { BaseContext } from '@stratix/runtime';
import type { ContextMetadata } from '@stratix/core';

export class ProductContext extends BaseContext {
  readonly metadata: ContextMetadata = {
    name: 'Product',
    version: '1.0.0',
    dependencies: [],
  };

  async initialize(): Promise<void> {
    // Register handlers, repositories, etc.
  }
}
```

---

### 3. `stratix generate agent <name>` - Generar AI Agent

**¿Qué debe hacer?**
- Crear clase `AIAgent` de ejemplo
- Configuración básica lista para usar

**Opciones:**

| Flag | Descripción |
|------|-------------|
| `--provider openai\|anthropic` | Provider de LLM (default: openai) |

**Resultado esperado:**

```
src/contexts/<context>/domain/agents/
└── <Name>Agent.ts
```

**Contenido de ejemplo:**

```typescript
import { AIAgent, EntityId, AgentCapabilities, AgentVersionFactory } from '@stratix/core';

export interface AssistantRequest {
  query: string;
}

export interface AssistantResponse {
  answer: string;
}

export class AssistantAgent extends AIAgent<AssistantRequest, AssistantResponse> {
  constructor() {
    super({
      id: EntityId.create<'Agent'>(),
      name: 'AssistantAgent',
      version: AgentVersionFactory.create('1.0.0'),
      capabilities: [AgentCapabilities.CHAT],
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      },
    });
  }
}
```

---

### 4. `stratix doctor` - Verificar proyecto

**¿Qué debe hacer?**
- Verificar dependencias de Stratix instaladas
- Validar estructura de carpetas
- Listar contextos encontrados
- Mostrar versiones

**Resultado esperado:**

```
✓ @stratix/core@0.7.6
✓ @stratix/runtime@0.7.6
✓ @stratix/di@0.7.6
✓ TypeScript strict mode enabled

Contexts: ProductContext, OrderContext

All checks passed!
```

---

### 5. `stratix info` - Mostrar información

**¿Qué debe hacer?**
- Resumen del proyecto
- Listar contextos y sus componentes
- Mostrar dependencias Stratix

---

## 📊 Tabla Resumen

| Comando | Descripción | Prioridad |
|---------|-------------|-----------|
| `stratix new` | Crear proyecto nuevo | 🔴 Alta |
| `stratix generate context` | Generar contexto con ejemplos User | 🔴 Alta |
| `stratix generate agent` | Generar AI Agent | 🟡 Media |
| `stratix doctor` | Verificar configuración | 🟢 Baja |
| `stratix info` | Mostrar información | 🟢 Baja |

---

## 🎯 MVP (Fase 1)

Solo 2 comandos esenciales:

1. **`stratix new <name>`** - Proyecto base funcional
2. **`stratix generate context <name>`** - Contexto con ejemplos User listos

**Flujo de uso:**

```bash
stratix new my-app
cd my-app
npm install
stratix generate context Product
npm run dev
```

**Tiempo estimado de setup: ~1 minuto**

---

## 📁 Estructura del Paquete CLI

```
packages/cli/
├── package.json
├── bin/
│   └── stratix.ts
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── new.ts
│   │   ├── generate-context.ts
│   │   ├── generate-agent.ts
│   │   ├── doctor.ts
│   │   └── info.ts
│   └── templates/
│       ├── project/           # Templates para new
│       ├── context/           # Templates con User de ejemplo
│       └── agent/             # Template de AIAgent
└── README.md
```

---

## 🛠️ Dependencias Sugeridas para CLI

| Dependencia | Propósito |
|-------------|-----------|
| `commander` | Parsing de argumentos CLI |
| `inquirer` | Prompts interactivos |
| `chalk` | Colores en terminal |
| `ora` | Spinners de progreso |
| `fs-extra` | Operaciones de archivos mejoradas |
| `execa` | Ejecución de comandos (npm install, etc.) |

---

## 📝 Notas

- La CLI debe agregarse a `pnpm-workspace.yaml` como `packages/cli`
- El binario se instala globalmente con `npm install -g @stratix/cli`
- Los templates usan archivos estáticos (no templating engine) para simplicidad inicial
