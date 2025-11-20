# Propuestas de Mejora Arquitectónica: Plugins y Modules

**Fecha:** 2025-11-19  
**Autor:** Análisis de Arquitectura  
**Versión Actual Analizada:** 0.2.0

---

## Índice

1. [Problemas Identificados](#1-problemas-identificados)
2. [Principios de Diseño Aplicados](#2-principios-de-diseño-aplicados)
3. [Propuestas de Mejora](#3-propuestas-de-mejora)
4. [Implementación Propuesta](#4-implementación-propuesta)
5. [Trade-offs y Consideraciones](#5-trade-offs-y-consideraciones)
6. [Plan de Migración](#6-plan-de-migración)

---

## 1. Problemas Identificados

### 1.1 Duplicación de Código en Lifecycle

**Problema:** Ambas interfaces (`Plugin` y `ContextModule`) repiten los mismos métodos de lifecycle.

```typescript
// En Plugin
initialize?(context: PluginContext): Promise<void>;
start?(): Promise<void>;
stop?(): Promise<void>;
healthCheck?(): Promise<HealthCheckResult>;

// En ContextModule (exactamente lo mismo)
initialize?(context: ModuleContext): Promise<void>;
start?(): Promise<void>;
stop?(): Promise<void>;
healthCheck?(): Promise<HealthCheckResult>;
```

**Impacto:**
- ❌ Violación del principio DRY (Don't Repeat Yourself)
- ❌ Mantenimiento duplicado
- ❌ Inconsistencias potenciales

### 1.2 Falta de Abstracción Común

**Problema:** No hay una interfaz base compartida que capture el concepto de "componente con lifecycle".

**Impacto:**
- ❌ No se puede tratar plugins y módulos de forma polimórfica cuando sea apropiado
- ❌ El `LifecycleManager` tiene código duplicado para manejar ambos
- ❌ Dificulta la extensibilidad futura

### 1.3 Contextos Inconsistentes

**Problema:** `PluginContext` tiene más capacidades que `ModuleContext`.

```typescript
// PluginContext tiene:
getService<T>(name: string): T | undefined;

// ModuleContext NO lo tiene
```

**Impacto:**
- ❌ Inconsistencia en la API
- ❌ Los módulos tienen que usar `container.resolve()` directamente
- ❌ Menos type-safety para módulos

### 1.4 Acoplamiento en LifecycleManager

**Problema:** El `LifecycleManager` tiene lógica específica de CQRS hardcodeada.

```typescript
// Dentro de initializeModule()
const commandBus = container.resolve('commandBus');
const queryBus = container.resolve('queryBus');
const eventBus = container.resolve('eventBus');

for (const cmd of commands) {
  commandBus.register(cmd.commandType, cmd.handler);
}
```

**Impacto:**
- ❌ Violación de Single Responsibility Principle
- ❌ El LifecycleManager conoce detalles de CQRS
- ❌ Dificulta testing y extensibilidad
- ❌ No se puede cambiar la estrategia de registro

### 1.5 Falta de Hooks Granulares

**Problema:** Solo hay 3 fases: `initialize`, `start`, `stop`.

**Impacto:**
- ❌ No hay hooks para eventos como `beforeStart`, `afterStart`
- ❌ Dificulta implementar cross-cutting concerns (logging, metrics)
- ❌ No se puede interceptar el lifecycle fácilmente

### 1.6 Gestión de Errores Limitada

**Problema:** No hay estrategia clara para manejar errores en el lifecycle.

**Impacto:**
- ❌ Si un plugin falla en `start()`, ¿se revierten los anteriores?
- ❌ No hay rollback automático
- ❌ No hay retry policies

### 1.7 Falta de Dependency Injection en Handlers

**Problema:** Los handlers se crean manualmente en los módulos.

```typescript
getCommands(): CommandDefinition[] {
  return [{
    handler: new CreateProductHandler(this.productRepository) // Manual
  }];
}
```

**Impacto:**
- ❌ No se aprovecha el DI container para handlers
- ❌ Dificulta testing (no se pueden mockear dependencias fácilmente)
- ❌ Acoplamiento fuerte

### 1.8 HealthCheck No Estandarizado

**Problema:** Cada plugin/módulo implementa su propio health check sin estructura.

**Impacto:**
- ❌ No hay agregación de health checks
- ❌ No hay niveles de severidad
- ❌ No hay health check compuesto

---

## 2. Principios de Diseño Aplicados

### 2.1 SOLID Principles

- **S - Single Responsibility:** Separar lifecycle management de CQRS registration
- **O - Open/Closed:** Extensible sin modificar código existente
- **L - Liskov Substitution:** Interfaces base intercambiables
- **I - Interface Segregation:** Interfaces pequeñas y específicas
- **D - Dependency Inversion:** Depender de abstracciones, no implementaciones

### 2.2 Design Patterns

- **Template Method:** Para lifecycle común
- **Strategy Pattern:** Para diferentes estrategias de registro
- **Observer Pattern:** Para lifecycle hooks
- **Composite Pattern:** Para health checks agregados
- **Factory Pattern:** Para creación de handlers

---

## 3. Propuestas de Mejora

### Mejora #1: Interfaz Base Común (Lifecycle)

**Propuesta:** Crear una interfaz `Lifecycle` que capture el comportamiento común.

```typescript
/**
 * Base lifecycle interface for all managed components.
 * Provides a standard lifecycle: initialize → start → stop
 */
export interface Lifecycle<TContext = unknown> {
  /**
   * Initializes the component.
   * Called during application startup.
   */
  initialize?(context: TContext): Promise<void>;

  /**
   * Starts the component.
   * Called after all components are initialized.
   */
  start?(): Promise<void>;

  /**
   * Stops the component.
   * Called during application shutdown.
   */
  stop?(): Promise<void>;
}
```

**Uso:**

```typescript
export interface Plugin extends Lifecycle<PluginContext> {
  readonly metadata: PluginMetadata;
  healthCheck?(): Promise<HealthCheckResult>;
}

export interface ContextModule extends Lifecycle<ModuleContext> {
  readonly metadata: ModuleMetadata;
  readonly contextName: string;
  
  getCommands?(): CommandDefinition[];
  getQueries?(): QueryDefinition[];
  getEventHandlers?(): EventHandlerDefinition[];
  getRepositories?(): RepositoryDefinition[];
  
  healthCheck?(): Promise<HealthCheckResult>;
}
```

**Beneficios:**
- ✅ Elimina duplicación
- ✅ Permite tratamiento polimórfico cuando sea apropiado
- ✅ Facilita testing con mocks genéricos
- ✅ Documenta el contrato de lifecycle en un solo lugar

---

### Mejora #2: Lifecycle Hooks Granulares

**Propuesta:** Agregar hooks para interceptar el lifecycle.

```typescript
/**
 * Extended lifecycle with granular hooks.
 */
export interface ExtendedLifecycle<TContext = unknown> extends Lifecycle<TContext> {
  /**
   * Called before initialize.
   */
  beforeInitialize?(context: TContext): Promise<void>;
  
  /**
   * Called after initialize completes successfully.
   */
  afterInitialize?(context: TContext): Promise<void>;
  
  /**
   * Called before start.
   */
  beforeStart?(): Promise<void>;
  
  /**
   * Called after start completes successfully.
   */
  afterStart?(): Promise<void>;
  
  /**
   * Called before stop.
   */
  beforeStop?(): Promise<void>;
  
  /**
   * Called after stop completes successfully.
   */
  afterStop?(): Promise<void>;
  
  /**
   * Called when an error occurs during any lifecycle phase.
   */
  onError?(phase: LifecyclePhase, error: Error): Promise<void>;
}
```

**Uso en Plugin:**

```typescript
export class PostgresPlugin implements Plugin, ExtendedLifecycle<PluginContext> {
  async beforeStart(): Promise<void> {
    this.logger.info('About to connect to database...');
  }
  
  async start(): Promise<void> {
    await this.database.connect();
  }
  
  async afterStart(): Promise<void> {
    this.logger.info('Database connected successfully');
    this.metrics.increment('database.connections');
  }
  
  async onError(phase: LifecyclePhase, error: Error): Promise<void> {
    this.logger.error(`Error in ${phase}:`, error);
    await this.notifyOps(error);
  }
}
```

**Beneficios:**
- ✅ Permite logging, metrics, tracing sin modificar lógica core
- ✅ Facilita debugging
- ✅ Soporta cross-cutting concerns
- ✅ Backward compatible (todos opcionales)

---

### Mejora #3: Contextos Unificados

**Propuesta:** Hacer que ambos contextos implementen una interfaz base común.

```typescript
/**
 * Base context for all managed components.
 */
export interface BaseContext {
  /**
   * The dependency injection container.
   */
  readonly container: Container;
  
  /**
   * Logger instance.
   */
  readonly logger: Logger;
  
  /**
   * Gets configuration for this component.
   */
  getConfig<T = unknown>(): T | undefined;
  
  /**
   * Gets a service from the container if it exists.
   * Type-safe helper for optional dependencies.
   */
  getService<T>(token: string): T | undefined;
  
  /**
   * Gets a required service from the container.
   * Throws if service is not found.
   */
  getRequiredService<T>(token: string): T;
}

/**
 * Context for plugins.
 */
export interface PluginContext extends BaseContext {
  /**
   * Gets all registered plugins.
   */
  getPlugins(): ReadonlyArray<PluginMetadata>;
  
  /**
   * Checks if a plugin is registered.
   */
  hasPlugin(name: string): boolean;
}

/**
 * Context for modules.
 */
export interface ModuleContext extends BaseContext {
  /**
   * Gets all registered modules.
   */
  getModules(): ReadonlyArray<ModuleMetadata>;
  
  /**
   * Checks if a module is registered.
   */
  hasModule(name: string): boolean;
  
  /**
   * Gets command bus for manual registration.
   */
  getCommandBus(): CommandBus;
  
  /**
   * Gets query bus for manual registration.
   */
  getQueryBus(): QueryBus;
  
  /**
   * Gets event bus for manual subscription.
   */
  getEventBus(): EventBus;
}
```

**Beneficios:**
- ✅ API consistente entre contextos
- ✅ Más type-safety con `getRequiredService`
- ✅ Módulos tienen acceso explícito a buses
- ✅ Mejor discoverability (qué plugins/módulos están disponibles)

---

### Mejora #4: Strategy Pattern para Registro de CQRS

**Propuesta:** Extraer la lógica de registro a una estrategia separada.

```typescript
/**
 * Strategy for registering module components.
 */
export interface ModuleRegistrationStrategy {
  /**
   * Registers repositories in the container.
   */
  registerRepositories(
    repositories: RepositoryDefinition[],
    container: Container
  ): Promise<void>;
  
  /**
   * Registers commands with the command bus.
   */
  registerCommands(
    commands: CommandDefinition[],
    commandBus: CommandBus
  ): Promise<void>;
  
  /**
   * Registers queries with the query bus.
   */
  registerQueries(
    queries: QueryDefinition[],
    queryBus: QueryBus
  ): Promise<void>;
  
  /**
   * Subscribes event handlers to the event bus.
   */
  registerEventHandlers(
    handlers: EventHandlerDefinition[],
    eventBus: EventBus
  ): Promise<void>;
}

/**
 * Default CQRS registration strategy.
 */
export class DefaultModuleRegistrationStrategy implements ModuleRegistrationStrategy {
  async registerRepositories(
    repositories: RepositoryDefinition[],
    container: Container
  ): Promise<void> {
    for (const repo of repositories) {
      container.register(repo.token, () => repo.instance, {
        lifetime: repo.singleton !== false 
          ? ServiceLifetime.SINGLETON 
          : ServiceLifetime.TRANSIENT,
      });
    }
  }
  
  async registerCommands(
    commands: CommandDefinition[],
    commandBus: CommandBus
  ): Promise<void> {
    for (const cmd of commands) {
      commandBus.register(cmd.commandType, cmd.handler);
    }
  }
  
  // ... otros métodos
}
```

**Uso en LifecycleManager:**

```typescript
export class LifecycleManager {
  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly moduleRegistry: ModuleRegistry,
    private readonly registrationStrategy: ModuleRegistrationStrategy = new DefaultModuleRegistrationStrategy()
  ) {}
  
  private async initializeModule(
    module: ContextModule,
    container: Container,
    logger: Logger,
    configs: Map<string, unknown>
  ): Promise<void> {
    // Usar la estrategia en lugar de lógica hardcodeada
    await this.registrationStrategy.registerRepositories(
      module.getRepositories?.() || [],
      container
    );
    
    await this.registrationStrategy.registerCommands(
      module.getCommands?.() || [],
      container.resolve('commandBus')
    );
    
    // ... etc
  }
}
```

**Beneficios:**
- ✅ Separación de responsabilidades
- ✅ Fácil de testear (mock de strategy)
- ✅ Extensible (custom strategies)
- ✅ Permite diferentes estrategias de registro (lazy, eager, etc.)

---

### Mejora #5: Factory Pattern para Handlers

**Propuesta:** Usar factories en lugar de instancias directas.

```typescript
/**
 * Factory for creating command handlers.
 */
export type CommandHandlerFactory<TCommand = unknown, TResult = unknown> = 
  (container: Container) => CommandHandler<TCommand, TResult>;

/**
 * Enhanced command definition with factory support.
 */
export interface CommandDefinition<TCommand = unknown, TResult = unknown> {
  name: string;
  commandType: new (...args: unknown[]) => TCommand;
  
  // Opción 1: Instancia directa (backward compatible)
  handler?: CommandHandler<TCommand, TResult>;
  
  // Opción 2: Factory (nuevo, recomendado)
  handlerFactory?: CommandHandlerFactory<TCommand, TResult>;
  
  // Opción 3: Token del DI container
  handlerToken?: string;
}
```

**Uso:**

```typescript
export class ProductsContextModule extends BaseContextModule {
  getCommands(): CommandDefinition[] {
    return [
      {
        name: 'CreateProduct',
        commandType: CreateProductCommand,
        // Opción 1: Factory function
        handlerFactory: (container) => new CreateProductHandler(
          container.resolve('productRepository'),
          container.resolve('eventBus'),
          container.resolve('logger')
        )
      },
      {
        name: 'UpdateProduct',
        commandType: UpdateProductCommand,
        // Opción 2: Token (handler ya registrado en container)
        handlerToken: 'updateProductHandler'
      }
    ];
  }
}
```

**Beneficios:**
- ✅ Lazy initialization de handlers
- ✅ Aprovecha DI container completamente
- ✅ Fácil de testear (inject mocks)
- ✅ Backward compatible (handler directo sigue funcionando)

---

### Mejora #6: Composite Health Checks

**Propuesta:** Implementar health checks jerárquicos y agregados.

```typescript
/**
 * Health check severity levels.
 */
export enum HealthSeverity {
  CRITICAL = 'critical',  // App no puede funcionar
  MAJOR = 'major',        // Funcionalidad importante afectada
  MINOR = 'minor',        // Funcionalidad secundaria afectada
  INFO = 'info'           // Solo informativo
}

/**
 * Enhanced health check result.
 */
export interface EnhancedHealthCheckResult {
  status: HealthStatus;
  message?: string;
  severity?: HealthSeverity;
  timestamp: Date;
  duration?: number; // ms
  details?: Record<string, unknown>;
  checks?: Record<string, EnhancedHealthCheckResult>; // Nested checks
}

/**
 * Health check interface.
 */
export interface HealthCheckable {
  healthCheck(): Promise<EnhancedHealthCheckResult>;
}

/**
 * Composite health check aggregator.
 */
export class CompositeHealthCheck implements HealthCheckable {
  constructor(
    private readonly name: string,
    private readonly checks: Map<string, HealthCheckable>
  ) {}
  
  async healthCheck(): Promise<EnhancedHealthCheckResult> {
    const start = Date.now();
    const results: Record<string, EnhancedHealthCheckResult> = {};
    
    let overallStatus = HealthStatus.UP;
    
    for (const [name, check] of this.checks) {
      try {
        results[name] = await check.healthCheck();
        
        // Agregar status (DOWN > DEGRADED > UP)
        if (results[name].status === HealthStatus.DOWN) {
          overallStatus = HealthStatus.DOWN;
        } else if (
          results[name].status === HealthStatus.DEGRADED && 
          overallStatus !== HealthStatus.DOWN
        ) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } catch (error) {
        results[name] = {
          status: HealthStatus.DOWN,
          message: error.message,
          severity: HealthSeverity.CRITICAL,
          timestamp: new Date()
        };
        overallStatus = HealthStatus.DOWN;
      }
    }
    
    return {
      status: overallStatus,
      message: `${this.name} health check`,
      timestamp: new Date(),
      duration: Date.now() - start,
      checks: results
    };
  }
}
```

**Uso:**

```typescript
// En Application
const pluginHealthChecks = new Map<string, HealthCheckable>();
for (const plugin of plugins) {
  if (plugin.healthCheck) {
    pluginHealthChecks.set(plugin.metadata.name, plugin);
  }
}

const moduleHealthChecks = new Map<string, HealthCheckable>();
for (const module of modules) {
  if (module.healthCheck) {
    moduleHealthChecks.set(module.metadata.name, module);
  }
}

const appHealthCheck = new CompositeHealthCheck('application', new Map([
  ['plugins', new CompositeHealthCheck('plugins', pluginHealthChecks)],
  ['modules', new CompositeHealthCheck('modules', moduleHealthChecks)]
]));

// Resultado jerárquico:
const health = await appHealthCheck.healthCheck();
/*
{
  status: 'up',
  checks: {
    plugins: {
      status: 'up',
      checks: {
        postgres: { status: 'up', duration: 5 },
        redis: { status: 'up', duration: 2 }
      }
    },
    modules: {
      status: 'degraded',
      checks: {
        products: { status: 'up' },
        orders: { status: 'degraded', message: 'Slow response' }
      }
    }
  }
}
*/
```

**Beneficios:**
- ✅ Health checks jerárquicos y agregados
- ✅ Severidad para priorizar problemas
- ✅ Métricas de performance (duration)
- ✅ Detalles adicionales para debugging

---

### Mejora #7: Error Handling y Rollback

**Propuesta:** Agregar estrategias de error handling y rollback.

```typescript
/**
 * Error handling strategy for lifecycle operations.
 */
export interface LifecycleErrorStrategy {
  /**
   * Handles an error during initialization.
   * @returns true to continue, false to abort
   */
  onInitializeError(
    component: Plugin | ContextModule,
    error: Error
  ): Promise<boolean>;
  
  /**
   * Handles an error during start.
   * @returns true to continue, false to abort
   */
  onStartError(
    component: Plugin | ContextModule,
    error: Error
  ): Promise<boolean>;
  
  /**
   * Handles an error during stop.
   * Should typically return true to continue stopping other components.
   */
  onStopError(
    component: Plugin | ContextModule,
    error: Error
  ): Promise<boolean>;
}

/**
 * Default error strategy: fail-fast on init/start, continue on stop.
 */
export class FailFastErrorStrategy implements LifecycleErrorStrategy {
  async onInitializeError(component: Plugin | ContextModule, error: Error): Promise<boolean> {
    console.error(`Failed to initialize ${component.metadata.name}:`, error);
    return false; // Abort
  }
  
  async onStartError(component: Plugin | ContextModule, error: Error): Promise<boolean> {
    console.error(`Failed to start ${component.metadata.name}:`, error);
    return false; // Abort
  }
  
  async onStopError(component: Plugin | ContextModule, error: Error): Promise<boolean> {
    console.error(`Failed to stop ${component.metadata.name}:`, error);
    return true; // Continue stopping others
  }
}

/**
 * Resilient error strategy: retry with backoff.
 */
export class ResilientErrorStrategy implements LifecycleErrorStrategy {
  constructor(
    private readonly maxRetries: number = 3,
    private readonly backoffMs: number = 1000
  ) {}
  
  async onInitializeError(component: Plugin | ContextModule, error: Error): Promise<boolean> {
    // Implementar retry logic con exponential backoff
    for (let i = 0; i < this.maxRetries; i++) {
      await this.sleep(this.backoffMs * Math.pow(2, i));
      
      try {
        if (component.initialize) {
          // Retry initialize
          // await component.initialize(context);
          return true; // Success
        }
      } catch (retryError) {
        if (i === this.maxRetries - 1) {
          return false; // Final retry failed
        }
      }
    }
    
    return false;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ... otros métodos
}
```

**Uso en LifecycleManager:**

```typescript
export class LifecycleManager {
  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly moduleRegistry: ModuleRegistry,
    private readonly errorStrategy: LifecycleErrorStrategy = new FailFastErrorStrategy()
  ) {}
  
  private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    try {
      // ... lógica de inicialización
    } catch (error) {
      const shouldContinue = await this.errorStrategy.onInitializeError(plugin, error);
      if (!shouldContinue) {
        throw new PluginLifecycleError(plugin.metadata.name, 'initialize', error);
      }
    }
  }
}
```

**Beneficios:**
- ✅ Estrategias de error configurables
- ✅ Retry automático con backoff
- ✅ Graceful degradation
- ✅ Mejor resiliencia

---

### Mejora #8: Metadata Enriquecida

**Propuesta:** Agregar más información a los metadatos.

```typescript
/**
 * Enhanced plugin metadata.
 */
export interface EnhancedPluginMetadata extends PluginMetadata {
  /**
   * Plugin author/maintainer.
   */
  author?: string;
  
  /**
   * Plugin homepage URL.
   */
  homepage?: string;
  
  /**
   * Plugin tags for categorization.
   */
  tags?: string[];
  
  /**
   * Minimum required versions of dependencies.
   */
  dependencyVersions?: Record<string, string>;
  
  /**
   * Optional dependencies (won't fail if missing).
   */
  optionalDependencies?: string[];
  
  /**
   * Conflicts with other plugins.
   */
  conflicts?: string[];
  
  /**
   * Initialization priority (lower = earlier).
   * Default: 100
   */
  priority?: number;
  
  /**
   * Whether this plugin is required for the app to function.
   */
  required?: boolean;
}
```

**Beneficios:**
- ✅ Mejor gestión de dependencias
- ✅ Detección de conflictos
- ✅ Priorización de inicialización
- ✅ Documentación mejorada

---

### Mejora #9: Plugin/Module Discovery

**Propuesta:** Sistema de auto-discovery de plugins y módulos.

```typescript
/**
 * Plugin/Module loader interface.
 */
export interface ComponentLoader {
  /**
   * Discovers and loads components from a directory.
   */
  loadFromDirectory(path: string): Promise<Array<Plugin | ContextModule>>;
  
  /**
   * Loads a component from a package name.
   */
  loadFromPackage(packageName: string): Promise<Plugin | ContextModule>;
}

/**
 * Convention-based loader.
 */
export class ConventionBasedLoader implements ComponentLoader {
  async loadFromDirectory(path: string): Promise<Array<Plugin | ContextModule>> {
    const components: Array<Plugin | ContextModule> = [];
    
    // Buscar archivos que terminen en .plugin.ts o .module.ts
    const files = await this.findFiles(path, /\.(plugin|module)\.(ts|js)$/);
    
    for (const file of files) {
      const module = await import(file);
      
      // Convención: exportar como default o con nombre específico
      const component = module.default || module.plugin || module.module;
      
      if (this.isPlugin(component) || this.isModule(component)) {
        components.push(component);
      }
    }
    
    return components;
  }
  
  private isPlugin(obj: unknown): obj is Plugin {
    return obj && typeof obj === 'object' && 'metadata' in obj;
  }
  
  private isModule(obj: unknown): obj is ContextModule {
    return obj && typeof obj === 'object' && 'metadata' in obj && 'contextName' in obj;
  }
  
  // ... helper methods
}
```

**Uso:**

```typescript
const loader = new ConventionBasedLoader();

// Auto-discover plugins
const plugins = await loader.loadFromDirectory('./src/plugins');

// Auto-discover modules
const modules = await loader.loadFromDirectory('./src/modules');

const app = await ApplicationBuilder.create()
  .usePlugins(plugins)
  .useContexts(modules)
  .build();
```

**Beneficios:**
- ✅ Menos configuración manual
- ✅ Convención sobre configuración
- ✅ Facilita agregar nuevos plugins/módulos
- ✅ Mejor developer experience

---

### Mejora #10: Observability Hooks

**Propuesta:** Integrar observability (logging, metrics, tracing) en el lifecycle.

```typescript
/**
 * Lifecycle observer for cross-cutting concerns.
 */
export interface LifecycleObserver {
  /**
   * Called before any lifecycle operation.
   */
  beforeOperation(
    component: Plugin | ContextModule,
    operation: 'initialize' | 'start' | 'stop',
    context?: unknown
  ): Promise<void>;
  
  /**
   * Called after successful lifecycle operation.
   */
  afterOperation(
    component: Plugin | ContextModule,
    operation: 'initialize' | 'start' | 'stop',
    duration: number
  ): Promise<void>;
  
  /**
   * Called when lifecycle operation fails.
   */
  onOperationError(
    component: Plugin | ContextModule,
    operation: 'initialize' | 'start' | 'stop',
    error: Error,
    duration: number
  ): Promise<void>;
}

/**
 * Logging observer.
 */
export class LoggingObserver implements LifecycleObserver {
  constructor(private readonly logger: Logger) {}
  
  async beforeOperation(
    component: Plugin | ContextModule,
    operation: string
  ): Promise<void> {
    this.logger.info(`[${component.metadata.name}] Starting ${operation}...`);
  }
  
  async afterOperation(
    component: Plugin | ContextModule,
    operation: string,
    duration: number
  ): Promise<void> {
    this.logger.info(
      `[${component.metadata.name}] Completed ${operation} in ${duration}ms`
    );
  }
  
  async onOperationError(
    component: Plugin | ContextModule,
    operation: string,
    error: Error
  ): Promise<void> {
    this.logger.error(
      `[${component.metadata.name}] Failed ${operation}:`,
      error
    );
  }
}

/**
 * Metrics observer.
 */
export class MetricsObserver implements LifecycleObserver {
  constructor(private readonly metrics: MetricsClient) {}
  
  async afterOperation(
    component: Plugin | ContextModule,
    operation: string,
    duration: number
  ): Promise<void> {
    this.metrics.histogram('lifecycle.operation.duration', duration, {
      component: component.metadata.name,
      operation
    });
    
    this.metrics.increment('lifecycle.operation.success', {
      component: component.metadata.name,
      operation
    });
  }
  
  async onOperationError(
    component: Plugin | ContextModule,
    operation: string,
    error: Error
  ): Promise<void> {
    this.metrics.increment('lifecycle.operation.error', {
      component: component.metadata.name,
      operation,
      error: error.constructor.name
    });
  }
  
  // ... otros métodos
}
```

**Uso en LifecycleManager:**

```typescript
export class LifecycleManager {
  private observers: LifecycleObserver[] = [];
  
  addObserver(observer: LifecycleObserver): void {
    this.observers.push(observer);
  }
  
  private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    const start = Date.now();
    
    try {
      // Notify observers
      await this.notifyObservers('beforeOperation', plugin, 'initialize', context);
      
      // Actual initialization
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
      
      const duration = Date.now() - start;
      
      // Notify success
      await this.notifyObservers('afterOperation', plugin, 'initialize', duration);
    } catch (error) {
      const duration = Date.now() - start;
      
      // Notify error
      await this.notifyObservers('onOperationError', plugin, 'initialize', error, duration);
      
      throw error;
    }
  }
  
  private async notifyObservers(method: string, ...args: unknown[]): Promise<void> {
    for (const observer of this.observers) {
      await observer[method](...args);
    }
  }
}
```

**Beneficios:**
- ✅ Logging automático de lifecycle
- ✅ Métricas de performance
- ✅ Tracing distribuido
- ✅ Separación de concerns

---

## 4. Implementación Propuesta

### 4.1 Estructura de Archivos Nueva

```
packages/abstractions/src/
├── lifecycle/
│   ├── Lifecycle.ts                    # NEW: Base interface
│   ├── ExtendedLifecycle.ts           # NEW: Con hooks
│   ├── LifecycleObserver.ts           # NEW: Observer pattern
│   └── LifecycleErrorStrategy.ts      # NEW: Error handling
├── context/
│   ├── BaseContext.ts                 # NEW: Base context
│   ├── PluginContext.ts               # MODIFIED: Extends BaseContext
│   └── ModuleContext.ts               # MODIFIED: Extends BaseContext
├── plugin/
│   ├── Plugin.ts                      # MODIFIED: Extends Lifecycle
│   ├── PluginMetadata.ts              # MODIFIED: Enhanced
│   └── PluginLoader.ts                # NEW: Auto-discovery
├── module/
│   ├── ContextModule.ts               # MODIFIED: Extends Lifecycle
│   ├── ModuleMetadata.ts              # MODIFIED: Enhanced
│   ├── ModuleRegistrationStrategy.ts  # NEW: Strategy pattern
│   └── ModuleLoader.ts                # NEW: Auto-discovery
├── health/
│   ├── HealthCheckable.ts             # NEW: Interface
│   ├── EnhancedHealthCheckResult.ts   # NEW: Enhanced result
│   └── CompositeHealthCheck.ts        # NEW: Composite pattern
└── handlers/
    ├── HandlerFactory.ts              # NEW: Factory pattern
    └── CommandDefinition.ts           # MODIFIED: Con factory support
```

### 4.2 Cambios en Runtime

```
packages/runtime/src/
├── lifecycle/
│   ├── LifecycleManager.ts            # MODIFIED: Con observers y strategies
│   └── observers/
│       ├── LoggingObserver.ts         # NEW
│       ├── MetricsObserver.ts         # NEW
│       └── TracingObserver.ts         # NEW
└── builder/
    ├── ApplicationBuilder.ts          # MODIFIED: Con auto-discovery
    └── DefaultPluginContext.ts        # MODIFIED: Implements BaseContext
```

---

## 5. Trade-offs y Consideraciones

### 5.1 Complejidad vs Flexibilidad

**Trade-off:**
- ➕ Más flexibilidad y extensibilidad
- ➖ Mayor complejidad inicial
- ➖ Curva de aprendizaje más pronunciada

**Mitigación:**
- Mantener defaults sensatos
- Documentación exhaustiva
- Ejemplos claros
- Backward compatibility donde sea posible

### 5.2 Performance

**Consideraciones:**
- Los observers agregan overhead mínimo
- Factories pueden ser lazy (mejor performance inicial)
- Health checks compuestos pueden ser costosos

**Mitigación:**
- Hacer observers opcionales
- Cachear resultados de health checks
- Permitir configurar timeouts

### 5.3 Backward Compatibility

**Estrategia:**
- Mantener interfaces antiguas como deprecated
- Agregar adapters para migración gradual
- Versionar cambios breaking (0.x → 1.0)

### 5.4 Testing

**Impacto:**
- Más interfaces = más mocks necesarios
- Strategies facilitan testing

**Mitigación:**
- Proveer test utilities en `@stratix/testing`
- Mocks predefinidos para interfaces comunes

---

## 6. Plan de Migración

### Fase 1: Fundamentos (v0.3.0)

**Objetivo:** Agregar abstracciones sin breaking changes.

- [ ] Crear `Lifecycle<TContext>` interface
- [ ] Crear `BaseContext` interface
- [ ] Hacer que `Plugin` y `ContextModule` extiendan `Lifecycle`
- [ ] Hacer que contextos extiendan `BaseContext`
- [ ] Agregar `getRequiredService()` a contextos
- [ ] Documentar nuevas interfaces

**Breaking Changes:** Ninguno (solo adiciones)

### Fase 2: Observability (v0.4.0)

**Objetivo:** Agregar hooks y observers.

- [ ] Implementar `LifecycleObserver`
- [ ] Crear `LoggingObserver`, `MetricsObserver`
- [ ] Modificar `LifecycleManager` para soportar observers
- [ ] Agregar `ExtendedLifecycle` interface (opcional)
- [ ] Documentar uso de observers

**Breaking Changes:** Ninguno (todo opcional)

### Fase 3: Strategies (v0.5.0)

**Objetivo:** Extraer lógica a strategies.

- [ ] Crear `ModuleRegistrationStrategy`
- [ ] Implementar `DefaultModuleRegistrationStrategy`
- [ ] Modificar `LifecycleManager` para usar strategy
- [ ] Crear `LifecycleErrorStrategy`
- [ ] Implementar strategies de error (FailFast, Resilient)
- [ ] Documentar custom strategies

**Breaking Changes:** Mínimos (constructor de LifecycleManager)

### Fase 4: Factories y Discovery (v0.6.0)

**Objetivo:** Mejorar DX con factories y auto-discovery.

- [ ] Agregar factory support a `CommandDefinition`, etc.
- [ ] Crear `ComponentLoader` interface
- [ ] Implementar `ConventionBasedLoader`
- [ ] Agregar auto-discovery a `ApplicationBuilder`
- [ ] Documentar convenciones

**Breaking Changes:** Ninguno (backward compatible)

### Fase 5: Health Checks (v0.7.0)

**Objetivo:** Health checks mejorados.

- [ ] Crear `EnhancedHealthCheckResult`
- [ ] Implementar `CompositeHealthCheck`
- [ ] Agregar severity levels
- [ ] Crear endpoint de health check en HTTP plugin
- [ ] Documentar health check patterns

**Breaking Changes:** Mínimos (cambio en estructura de resultado)

### Fase 6: Metadata y Cleanup (v1.0.0)

**Objetivo:** Finalizar para v1.0.

- [ ] Enriquecer metadata (priority, conflicts, etc.)
- [ ] Deprecar interfaces antiguas
- [ ] Crear migration guide
- [ ] Actualizar toda la documentación
- [ ] Estabilizar API

**Breaking Changes:** Remover deprecated APIs

---

## 7. Ejemplos de Uso Final

### 7.1 Plugin Moderno

```typescript
export class PostgresPlugin implements Plugin, ExtendedLifecycle<PluginContext> {
  readonly metadata: EnhancedPluginMetadata = {
    name: 'postgres',
    version: '2.0.0',
    description: 'PostgreSQL database plugin',
    dependencies: ['logger'],
    optionalDependencies: ['metrics'],
    tags: ['database', 'sql', 'persistence'],
    priority: 10, // Alta prioridad
    required: true
  };

  private database?: Database;
  private metrics?: MetricsClient;

  async beforeInitialize(context: PluginContext): Promise<void> {
    this.metrics = context.getService<MetricsClient>('metrics');
  }

  async initialize(context: PluginContext): Promise<void> {
    const config = context.getConfig<DatabaseConfig>();
    this.database = new Database(config);

    context.container.register('database', () => this.database, {
      lifetime: ServiceLifetime.SINGLETON
    });
  }

  async afterInitialize(context: PluginContext): Promise<void> {
    const logger = context.logger;
    logger.info('PostgreSQL plugin initialized');
  }

  async start(): Promise<void> {
    await this.database?.connect();
    this.metrics?.increment('database.connections');
  }

  async stop(): Promise<void> {
    await this.database?.disconnect();
  }

  async healthCheck(): Promise<EnhancedHealthCheckResult> {
    const start = Date.now();
    
    try {
      await this.database?.ping();
      
      return {
        status: HealthStatus.UP,
        message: 'Database is healthy',
        severity: HealthSeverity.INFO,
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          connections: await this.database?.getConnectionCount()
        }
      };
    } catch (error) {
      return {
        status: HealthStatus.DOWN,
        message: error.message,
        severity: HealthSeverity.CRITICAL,
        timestamp: new Date(),
        duration: Date.now() - start
      };
    }
  }

  async onError(phase: LifecyclePhase, error: Error): Promise<void> {
    this.metrics?.increment('plugin.error', {
      plugin: 'postgres',
      phase
    });
  }
}
```

### 7.2 Module Moderno

```typescript
export class ProductsContextModule extends BaseContextModule {
  readonly metadata: EnhancedModuleMetadata = {
    name: 'products-context',
    version: '2.0.0',
    description: 'Products Domain Module',
    requiredPlugins: ['postgres'],
    optionalPlugins: ['redis'],
    tags: ['domain', 'products', 'catalog'],
    priority: 50
  };

  readonly contextName = 'Products';

  getCommands(): CommandDefinition[] {
    return [
      {
        name: 'CreateProduct',
        commandType: CreateProductCommand,
        // Factory pattern - lazy initialization con DI
        handlerFactory: (container) => new CreateProductHandler(
          container.getRequiredService('productRepository'),
          container.getRequiredService('eventBus'),
          container.getService('cache') // Optional
        )
      }
    ];
  }

  getRepositories(): RepositoryDefinition[] {
    return [
      {
        token: 'productRepository',
        // También puede ser factory
        factory: (container) => {
          const db = container.getRequiredService('database');
          const cache = container.getService('cache');
          
          return cache 
            ? new CachedProductRepository(db, cache)
            : new ProductRepository(db);
        },
        singleton: true
      }
    ];
  }

  async initialize(context: ModuleContext): Promise<void> {
    // Auto-registration via super
    await super.initialize(context);
    
    // Custom initialization
    const config = context.getConfig<ProductsConfig>();
    if (config?.enableRecommendations) {
      // Setup recommendations
    }
  }

  async healthCheck(): Promise<EnhancedHealthCheckResult> {
    const checks = new Map<string, HealthCheckable>();
    
    // Check repository
    checks.set('repository', {
      healthCheck: async () => {
        try {
          await this.context?.container.getRequiredService('productRepository').count();
          return {
            status: HealthStatus.UP,
            timestamp: new Date()
          };
        } catch (error) {
          return {
            status: HealthStatus.DOWN,
            message: error.message,
            severity: HealthSeverity.MAJOR,
            timestamp: new Date()
          };
        }
      }
    });
    
    const composite = new CompositeHealthCheck('products-module', checks);
    return composite.healthCheck();
  }
}
```

### 7.3 Application Setup Moderno

```typescript
// Auto-discovery
const loader = new ConventionBasedLoader();
const plugins = await loader.loadFromDirectory('./src/plugins');
const modules = await loader.loadFromDirectory('./src/modules');

// Setup con observers y strategies
const app = await ApplicationBuilder.create()
  .useContainer(new AwilixContainer())
  .useLogger(new ConsoleLogger())
  
  // Observers para observability
  .addLifecycleObserver(new LoggingObserver(logger))
  .addLifecycleObserver(new MetricsObserver(metrics))
  .addLifecycleObserver(new TracingObserver(tracer))
  
  // Error strategy
  .useErrorStrategy(new ResilientErrorStrategy(3, 1000))
  
  // Registration strategy (custom si es necesario)
  .useRegistrationStrategy(new DefaultModuleRegistrationStrategy())
  
  // Auto-discovered components
  .usePlugins(plugins)
  .useContexts(modules)
  
  .build();

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await app.healthCheck();
  res.status(health.status === HealthStatus.UP ? 200 : 503).json(health);
});

await app.start();
```

---

## 8. Conclusión

Las mejoras propuestas transforman el sistema de plugins y módulos en una arquitectura más:

✅ **Modular:** Separación clara de responsabilidades  
✅ **Extensible:** Fácil agregar nuevas capacidades  
✅ **Testeable:** Interfaces pequeñas y mockeable  
✅ **Observable:** Logging, metrics, tracing integrados  
✅ **Resiliente:** Error handling y retry automático  
✅ **Type-safe:** Mejor uso de TypeScript  
✅ **Developer-friendly:** Auto-discovery, factories, convenciones  

### Prioridades Recomendadas

1. **Alta:** Mejoras #1, #3 (interfaces base y contextos)
2. **Media:** Mejoras #4, #5, #10 (strategies, factories, observability)
3. **Baja:** Mejoras #2, #6, #8, #9 (hooks, health checks, metadata, discovery)

### Próximos Pasos

1. Revisar propuestas con el equipo
2. Crear RFCs para cambios breaking
3. Implementar en fases según plan de migración
4. Actualizar documentación
5. Crear migration guides

---

**Última actualización:** 2025-11-19  
**Versión del documento:** 1.0
