# Simplificación de Dependency Injection (DI)

**Fecha:** 2025-11-19  
**Objetivo:** Reducir verbosidad en el sistema de DI desde Container hasta Awilix

> **IMPORTANTE:** Stratix **NO utiliza decorators** de TypeScript. Todas las propuestas en este documento evitan decorators y se enfocan en soluciones pragmáticas usando:
> - Métodos de conveniencia (singleton, scoped, transient)
> - Auto-wiring nativo de Awilix (sin reflect-metadata)
> - Convenciones de naming
> - API fluida opcional

---

## Índice

1. [Problemas de Verbosidad Identificados](#1-problemas-de-verbosidad-identificados)
2. [Análisis Comparativo con Otros Frameworks](#2-análisis-comparativo-con-otros-frameworks)
3. [Propuestas de Simplificación](#3-propuestas-de-simplificación)
4. [Implementación Propuesta](#4-implementación-propuesta)
5. [Ejemplos Antes/Después](#5-ejemplos-antesdespués)
6. [Plan de Migración](#6-plan-de-migración)


---

## 1. Problemas de Verbosidad Identificados

### 1.1 Registro Repetitivo con Factories

**Problema Actual:**

```typescript
// En AuthPlugin.ts
context.container.register('jwtService', () => this.jwtService);
context.container.register('passwordHasher', () => this.passwordHasher);
context.container.register('rbacService', () => this.rbacService);
```

**Análisis:**
- ❌ Cada registro requiere una arrow function `() =>`
- ❌ Repetición del nombre del servicio
- ❌ No hay inferencia de tipos
- ❌ Lifetime siempre debe especificarse explícitamente (o usar default)

### 1.2 Lifetime Verboso

**Problema Actual:**

```typescript
container.register('database', () => new Database(), {
  lifetime: ServiceLifetime.SINGLETON  // Muy verboso
});
```

**Análisis:**
- ❌ `ServiceLifetime.SINGLETON` es largo
- ❌ Objeto de opciones para un solo parámetro
- ❌ No hay shortcuts para casos comunes

### 1.3 Resolución con Dependencias

**Problema Actual:**

```typescript
container.register('userService', (context) => {
  const repository = context.resolve<UserRepository>('userRepository');
  const eventBus = context.resolve<EventBus>('eventBus');
  const logger = context.resolve<Logger>('logger');
  return new UserService(repository, eventBus, logger);
});
```

**Análisis:**
- ❌ Mucho boilerplate para resolver dependencias
- ❌ Repetición de tipos
- ❌ No hay auto-wiring
- ❌ Fácil olvidar dependencias

### 1.4 Falta de Métodos de Conveniencia

**Problema Actual:**

```typescript
// No hay métodos específicos para casos comunes
container.register('config', () => config); // Singleton value
container.register('logger', () => new Logger()); // Singleton class
container.register('requestId', () => uuid()); // Transient factory
```

**Análisis:**
- ❌ Todos usan el mismo método `register()`
- ❌ No hay diferenciación semántica
- ❌ No hay optimizaciones específicas

### 1.5 Sin Soporte para Clases Directas

**Problema Actual:**

```typescript
// Tienes que crear la instancia manualmente
container.register('userService', () => new UserService());

// En lugar de algo más simple
container.registerClass(UserService);
```

**Análisis:**
- ❌ No hay auto-wiring de constructores
- ❌ Más verboso que otros frameworks DI
- ❌ Requiere instanciación manual

### 1.6 Configuración de Awilix Oculta

**Problema Actual:**

```typescript
// AwilixContainer.ts - Línea 63
this.container.register({
  [name]: awilix.asFunction(awilixFactory, { lifetime }),
});
```

**Análisis:**
- ❌ Awilix tiene `asClass`, `asValue`, `asFunction` pero no se exponen
- ❌ Se pierde flexibilidad de Awilix
- ❌ Wrapper innecesariamente limitante

---

## 2. Análisis Comparativo con Otros Frameworks

### 2.1 NestJS (InversifyJS)

```typescript
// Decorators + Auto-wiring
@Injectable()
class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly eventBus: EventBus
  ) {}
}

// Registro automático
@Module({
  providers: [UserService, UserRepository]
})
```

**Ventajas:**
- ✅ Auto-wiring completo
- ✅ Decorators para metadata
- ✅ Cero boilerplate

**Desventajas:**
- ❌ Requiere decorators (experimental en TypeScript)
- ❌ Acoplamiento a framework
- ❌ **No compatible con Stratix** (evitamos decorators)

### 2.2 TSyringe

```typescript
// Decorators opcionales (no usaremos esto)
@injectable()
class UserService {
  constructor(
    @inject("UserRepository") private repository: UserRepository
  ) {}
}

// Manual (preferido para Stratix)
container.register("UserService", { useClass: UserService });
container.registerSingleton("Logger", Logger);
```

**Ventajas:**
- ✅ Métodos específicos (`registerSingleton`, `registerInstance`)
- ✅ Decorators opcionales (pero no los usaremos)
- ✅ API limpia

**Relevancia para Stratix:**
- ✅ Inspiración para métodos de conveniencia
- ❌ Evitaremos decorators

### 2.3 Awilix (Directo)

```typescript
// Awilix puro
container.register({
  userService: asClass(UserService).singleton(),
  userRepository: asClass(UserRepository).scoped(),
  logger: asValue(new Logger()),
  config: asValue(config)
});
```

**Ventajas:**
- ✅ Fluent API
- ✅ Métodos específicos (`asClass`, `asValue`, `asFunction`)
- ✅ Chainable lifetime

**Desventajas:**
- ❌ Registro en bloque puede ser confuso
- ❌ No type-safe por defecto

---

## 3. Propuestas de Simplificación

### Propuesta #1: Métodos de Conveniencia

**Agregar métodos específicos para casos comunes.**

```typescript
export interface Container {
  // Métodos existentes
  register<T>(token: Token<T>, factory: Factory<T>, options?: RegisterOptions): void;
  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  createScope(): Container;
  dispose(): Promise<void>;
  
  // NUEVOS: Métodos de conveniencia
  
  /**
   * Registers a singleton value (already instantiated).
   * @example container.singleton('config', configObject);
   */
  singleton<T>(token: Token<T>, value: T): void;
  
  /**
   * Registers a singleton class with auto-wiring.
   * @example container.singletonClass(UserService);
   */
  singletonClass<T>(
    classType: new (...args: any[]) => T,
    token?: Token<T>
  ): void;
  
  /**
   * Registers a scoped class.
   * @example container.scopedClass(RequestContext);
   */
  scopedClass<T>(
    classType: new (...args: any[]) => T,
    token?: Token<T>
  ): void;
  
  /**
   * Registers a transient factory.
   * @example container.transient('requestId', () => uuid());
   */
  transient<T>(token: Token<T>, factory: () => T): void;
  
  /**
   * Registers multiple services at once.
   * @example container.registerAll({
   *   logger: () => new Logger(),
   *   config: () => config
   * });
   */
  registerAll(services: Record<string, Factory<any> | any>): void;
}
```

**Beneficios:**
- ✅ Menos verboso para casos comunes
- ✅ Semántica clara (singleton vs transient)
- ✅ Backward compatible (métodos adicionales)

---

### Propuesta #2: Fluent API para Lifetime

**Hacer el lifetime más fluido.**

```typescript
export interface RegistrationBuilder<T> {
  /**
   * Marks the service as singleton.
   */
  asSingleton(): void;
  
  /**
   * Marks the service as scoped.
   */
  asScoped(): void;
  
  /**
   * Marks the service as transient.
   */
  asTransient(): void;
}

export interface Container {
  // Nuevo método que retorna builder
  bind<T>(token: Token<T>): RegistrationBuilder<T>;
}
```

**Uso:**

```typescript
// Fluent API
container.bind('logger').to(() => new Logger()).asSingleton();
container.bind('requestId').to(() => uuid()).asTransient();
container.bind(UserService).toClass(UserService).asSingleton();
```

**Beneficios:**
- ✅ API fluida y legible
- ✅ Chainable
- ✅ Inspirado en otros frameworks DI

**Desventajas:**
- ❌ Más complejo de implementar
- ❌ Puede ser overkill

---

### Propuesta #3: Auto-Wiring con Awilix Nativo

**Aprovechar el auto-wiring nativo de Awilix sin decorators.**

Awilix ya tiene auto-wiring incorporado usando convenciones de naming:

```typescript
// Clase con dependencias nombradas según convención
class UserService {
  constructor(
    private userRepository: UserRepository,  // Auto-resuelve 'userRepository'
    private eventBus: EventBus,              // Auto-resuelve 'eventBus'
    private logger: Logger                   // Auto-resuelve 'logger'
  ) {}
}

// Registro simple - Awilix auto-wirea las dependencias
container.registerClass(UserService);
```

**Cómo funciona:**

```typescript
class AwilixContainer {
  registerClass<T>(
    classType: new (...args: any[]) => T,
    options?: {
      token?: Token<T>;
      lifetime?: ServiceLifetime;
      injectionMode?: 'PROXY' | 'CLASSIC';
    }
  ): void {
    const token = options?.token || classType;
    const name = this.getTokenName(token);
    const lifetime = this.mapLifetime(options?.lifetime ?? ServiceLifetime.SINGLETON);
    
    // Awilix auto-wiring: PROXY mode (default) o CLASSIC mode
    this.container.register({
      [name]: awilix.asClass(classType, { 
        lifetime,
        injectionMode: options?.injectionMode || awilix.InjectionMode.PROXY
      })
    });
  }
}
```

**Convenciones de Naming:**

```typescript
// Opción 1: Naming por parámetro (PROXY mode - default)
class UserService {
  constructor(
    private userRepository: UserRepository,  // Busca 'userRepository'
    private eventBus: EventBus               // Busca 'eventBus'
  ) {}
}

// Opción 2: Naming explícito con objeto de configuración
class UserService {
  constructor(deps: {
    userRepository: UserRepository;
    eventBus: EventBus;
  }) {
    this.repository = deps.userRepository;
    this.eventBus = deps.eventBus;
  }
}

// Opción 3: CLASSIC mode con array de nombres
container.registerClass(UserService, {
  injectionMode: 'CLASSIC',
  // Awilix infiere del constructor
});
```

**Ejemplo Completo:**

```typescript
// 1. Registrar dependencias
container.registerClass(UserRepository);
container.singleton('eventBus', new EventBus());
container.singleton('logger', () => new Logger());

// 2. Registrar servicio con auto-wiring
container.registerClass(UserService);

// 3. Resolver - todas las dependencias se inyectan automáticamente
const userService = container.resolve<UserService>(UserService);
```

**Beneficios:**
- ✅ Auto-wiring sin decorators
- ✅ Sin dependencias adicionales (reflect-metadata)
- ✅ Sin configuración de tsconfig
- ✅ Usa capacidades nativas de Awilix
- ✅ Menos bundle size
- ✅ Type-safe con TypeScript

**Limitaciones:**
- ⚠️ Requiere naming consistente entre parámetros y tokens
- ⚠️ PROXY mode puede tener overhead mínimo
- ⚠️ Para casos complejos, usar factory manual

---

### Propuesta #4: Shortcuts para Lifetime

**Simplificar la especificación de lifetime.**

```typescript
// Enum más corto
export enum Lifetime {
  SINGLETON = 'singleton',
  SCOPED = 'scoped',
  TRANSIENT = 'transient'
}

// O constantes
export const Lifetime = {
  Singleton: 'singleton',
  Scoped: 'scoped',
  Transient: 'transient'
} as const;

// Uso
container.register('logger', () => new Logger(), { lifetime: Lifetime.Singleton });

// Aún mejor: métodos directos
container.registerSingleton('logger', () => new Logger());
container.registerScoped('requestContext', () => new RequestContext());
container.registerTransient('requestId', () => uuid());
```

**Beneficios:**
- ✅ Más conciso
- ✅ Menos typing
- ✅ Backward compatible

---

### Propuesta #5: Exponer Capacidades de Awilix

**Permitir acceso directo a funcionalidades de Awilix.**

```typescript
export interface AwilixContainer extends Container {
  /**
   * Registers using Awilix's native API for advanced scenarios.
   */
  registerAwilix(registrations: awilix.NameAndRegistrationPair<any>): void;
  
  /**
   * Helper to create asClass registration.
   */
  asClass<T>(classType: new (...args: any[]) => T): awilix.ClassRegistration<T>;
  
  /**
   * Helper to create asFunction registration.
   */
  asFunction<T>(fn: (...args: any[]) => T): awilix.FunctionRegistration<T>;
  
  /**
   * Helper to create asValue registration.
   */
  asValue<T>(value: T): awilix.ValueRegistration<T>;
}
```

**Uso:**

```typescript
const container = new AwilixContainer();

// Opción 1: API simple (para casos comunes)
container.singleton('config', config);

// Opción 2: API de Awilix (para casos avanzados)
container.registerAwilix({
  userService: container.asClass(UserService)
    .singleton()
    .inject(() => ({ customDep: 'value' }))
});
```

**Beneficios:**
- ✅ Flexibilidad completa de Awilix
- ✅ No limita capacidades
- ✅ Escape hatch para casos avanzados

---

### Propuesta #6: Batch Registration

**Registrar múltiples servicios de una vez.**

```typescript
export interface Container {
  /**
   * Registers multiple services in batch.
   */
  registerBatch(config: {
    singletons?: Record<string, any | (() => any)>;
    scoped?: Record<string, new (...args: any[]) => any>;
    transients?: Record<string, () => any>;
    classes?: Array<new (...args: any[]) => any>;
  }): void;
}
```

**Uso:**

```typescript
container.registerBatch({
  singletons: {
    config: appConfig,
    logger: () => new Logger(),
    database: () => new Database(appConfig.db)
  },
  scoped: {
    requestContext: RequestContext
  },
  transients: {
    requestId: () => uuid()
  },
  classes: [UserService, ProductService, OrderService] // Auto-wiring
});
```

**Beneficios:**
- ✅ Registro en bloque
- ✅ Organizado por lifetime
- ✅ Menos repetición

---

## 4. Implementación Propuesta

### 4.1 Container Interface Mejorada

```typescript
/**
 * Enhanced dependency injection container interface.
 */
export interface Container {
  // ========================================
  // CORE API (Existente)
  // ========================================
  
  register<T>(token: Token<T>, factory: Factory<T>, options?: RegisterOptions): void;
  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  createScope(): Container;
  dispose(): Promise<void>;
  
  // ========================================
  // CONVENIENCE API (Nuevo)
  // ========================================
  
  /**
   * Registers a singleton value.
   * @example container.singleton('config', { port: 3000 });
   */
  singleton<T>(token: Token<T>, value: T | (() => T)): void;
  
  /**
   * Registers a scoped factory.
   * @example container.scoped('requestContext', () => new RequestContext());
   */
  scoped<T>(token: Token<T>, factory: () => T): void;
  
  /**
   * Registers a transient factory.
   * @example container.transient('requestId', () => uuid());
   */
  transient<T>(token: Token<T>, factory: () => T): void;
  
  /**
   * Registers a class as singleton with auto-wiring.
   * @example container.registerClass(UserService);
   */
  registerClass<T>(
    classType: new (...args: any[]) => T,
    options?: {
      token?: Token<T>;
      lifetime?: ServiceLifetime;
    }
  ): void;
  
  /**
   * Registers multiple services at once.
   * @example container.registerAll({
   *   logger: () => new Logger(),
   *   config: appConfig
   * });
   */
  registerAll(services: Record<string, any | (() => any)>): void;
  
  /**
   * Tries to resolve a service, returns undefined if not found.
   * @example const logger = container.tryResolve<Logger>('logger');
   */
  tryResolve<T>(token: Token<T>): T | undefined;
}
```

### 4.2 AwilixContainer Implementación

```typescript
export class AwilixContainer implements Container {
  private readonly container: awilix.AwilixContainer;
  private readonly tokenMap = new Map<Token<unknown>, string>();
  private tokenCounter = 0;

  constructor(awilixContainer?: awilix.AwilixContainer) {
    this.container = awilixContainer ?? awilix.createContainer();
  }

  // ========================================
  // CORE API (Existente - sin cambios)
  // ========================================
  
  register<T>(token: Token<T>, factory: Factory<T>, options?: RegisterOptions): void {
    const name = this.getTokenName(token);
    const lifetime = this.mapLifetime(options?.lifetime ?? ServiceLifetime.SINGLETON);
    const awilixFactory = () => factory(this);
    
    this.container.register({
      [name]: awilix.asFunction(awilixFactory, { lifetime }),
    });
  }

  resolve<T>(token: Token<T>): T {
    const name = this.getTokenName(token);
    if (!this.container.hasRegistration(name)) {
      throw new Error(`Service '${String(token)}' is not registered`);
    }
    return this.container.resolve<T>(name);
  }

  has<T>(token: Token<T>): boolean {
    const name = this.getTokenName(token);
    return this.container.hasRegistration(name);
  }

  createScope(): Container {
    const scopedAwilixContainer = this.container.createScope();
    const scopedContainer = new AwilixContainer(scopedAwilixContainer);
    this.tokenMap.forEach((value, key) => {
      scopedContainer.tokenMap.set(key, value);
    });
    scopedContainer.tokenCounter = this.tokenCounter;
    return scopedContainer;
  }

  async dispose(): Promise<void> {
    await this.container.dispose();
  }

  // ========================================
  // CONVENIENCE API (Nuevo)
  // ========================================
  
  singleton<T>(token: Token<T>, value: T | (() => T)): void {
    const name = this.getTokenName(token);
    
    if (typeof value === 'function') {
      // Es una factory
      this.container.register({
        [name]: awilix.asFunction(value as () => T, {
          lifetime: awilix.Lifetime.SINGLETON
        })
      });
    } else {
      // Es un valor directo
      this.container.register({
        [name]: awilix.asValue(value)
      });
    }
  }

  scoped<T>(token: Token<T>, factory: () => T): void {
    const name = this.getTokenName(token);
    this.container.register({
      [name]: awilix.asFunction(factory, {
        lifetime: awilix.Lifetime.SCOPED
      })
    });
  }

  transient<T>(token: Token<T>, factory: () => T): void {
    const name = this.getTokenName(token);
    this.container.register({
      [name]: awilix.asFunction(factory, {
        lifetime: awilix.Lifetime.TRANSIENT
      })
    });
  }

  registerClass<T>(
    classType: new (...args: any[]) => T,
    options?: {
      token?: Token<T>;
      lifetime?: ServiceLifetime;
    }
  ): void {
    const token = options?.token || classType;
    const name = this.getTokenName(token);
    const lifetime = this.mapLifetime(options?.lifetime ?? ServiceLifetime.SINGLETON);
    
    this.container.register({
      [name]: awilix.asClass(classType, { lifetime })
    });
  }

  registerAll(services: Record<string, any | (() => any)>): void {
    for (const [token, value] of Object.entries(services)) {
      if (typeof value === 'function' && value.prototype) {
        // Es una clase
        this.registerClass(value, { token });
      } else if (typeof value === 'function') {
        // Es una factory
        this.singleton(token, value);
      } else {
        // Es un valor
        this.singleton(token, value);
      }
    }
  }

  tryResolve<T>(token: Token<T>): T | undefined {
    try {
      return this.resolve(token);
    } catch {
      return undefined;
    }
  }

  // ========================================
  // AWILIX ADVANCED API (Nuevo)
  // ========================================
  
  /**
   * Registers using Awilix's native API for advanced scenarios.
   */
  registerAwilix(registrations: awilix.NameAndRegistrationPair<any>): void {
    this.container.register(registrations);
  }

  /**
   * Gets the internal Awilix container for advanced usage.
   */
  getAwilixContainer(): awilix.AwilixContainer {
    return this.container;
  }

  // ========================================
  // PRIVATE HELPERS (Sin cambios)
  // ========================================
  
  private getTokenName<T>(token: Token<T>): string {
    if (typeof token === 'string') {
      return token;
    }
    if (this.tokenMap.has(token)) {
      return this.tokenMap.get(token)!;
    }
    let name: string;
    if (typeof token === 'symbol') {
      const desc = token.description || 'anonymous';
      name = `__symbol_${desc}_${this.tokenCounter++}`;
    } else {
      name = token.name || `__class_${this.tokenCounter++}`;
    }
    this.tokenMap.set(token, name);
    return name;
  }

  private mapLifetime(lifetime: ServiceLifetime): awilix.LifetimeType {
    switch (lifetime) {
      case ServiceLifetime.SINGLETON:
        return awilix.Lifetime.SINGLETON;
      case ServiceLifetime.SCOPED:
        return awilix.Lifetime.SCOPED;
      case ServiceLifetime.TRANSIENT:
        return awilix.Lifetime.TRANSIENT;
      default:
        return awilix.Lifetime.SINGLETON;
    }
  }
}
```

---

## 5. Ejemplos Antes/Después

### 5.1 Plugin Registration

**ANTES:**

```typescript
export class AuthPlugin implements Plugin {
  initialize(context: PluginContext): Promise<void> {
    this.jwtService = new JWTService(this.options.jwt);
    this.passwordHasher = new BcryptPasswordHasher(this.options.passwordHashRounds);
    this.rbacService = new RBACService(this.options.roles);

    context.container.register('jwtService', () => this.jwtService);
    context.container.register('passwordHasher', () => this.passwordHasher);
    context.container.register('rbacService', () => this.rbacService);

    return Promise.resolve();
  }
}
```

**DESPUÉS (Opción 1 - Métodos de conveniencia):**

```typescript
export class AuthPlugin implements Plugin {
  initialize(context: PluginContext): Promise<void> {
    this.jwtService = new JWTService(this.options.jwt);
    this.passwordHasher = new BcryptPasswordHasher(this.options.passwordHashRounds);
    this.rbacService = new RBACService(this.options.roles);

    // Mucho más conciso
    context.container.registerAll({
      jwtService: this.jwtService,
      passwordHasher: this.passwordHasher,
      rbacService: this.rbacService
    });

    return Promise.resolve();
  }
}
```

**DESPUÉS (Opción 2 - Factories inline):**

```typescript
export class AuthPlugin implements Plugin {
  initialize(context: PluginContext): Promise<void> {
    context.container.registerAll({
      jwtService: () => new JWTService(this.options.jwt),
      passwordHasher: () => new BcryptPasswordHasher(this.options.passwordHashRounds),
      rbacService: () => new RBACService(this.options.roles)
    });

    return Promise.resolve();
  }
}
```

**Reducción:** De 3 líneas a 1 línea (67% menos código)

---

### 5.2 Service with Dependencies

**ANTES:**

```typescript
container.register('userService', (context) => {
  const repository = context.resolve<UserRepository>('userRepository');
  const eventBus = context.resolve<EventBus>('eventBus');
  const logger = context.resolve<Logger>('logger');
  return new UserService(repository, eventBus, logger);
}, {
  lifetime: ServiceLifetime.SINGLETON
});
```

**DESPUÉS:**

```typescript
// Auto-wiring con registerClass
container.registerClass(UserService);

// O con token custom
container.registerClass(UserService, { token: 'userService' });
```

**Reducción:** De 7 líneas a 1 línea (86% menos código)

---

### 5.3 Mixed Lifetimes

**ANTES:**

```typescript
container.register('config', () => appConfig, {
  lifetime: ServiceLifetime.SINGLETON
});

container.register('logger', () => new Logger(), {
  lifetime: ServiceLifetime.SINGLETON
});

container.register('requestContext', () => new RequestContext(), {
  lifetime: ServiceLifetime.SCOPED
});

container.register('requestId', () => uuid(), {
  lifetime: ServiceLifetime.TRANSIENT
});
```

**DESPUÉS:**

```typescript
container.singleton('config', appConfig);
container.singleton('logger', () => new Logger());
container.scoped('requestContext', () => new RequestContext());
container.transient('requestId', () => uuid());
```

**Reducción:** De 16 líneas a 4 líneas (75% menos código)

---

### 5.4 Batch Registration

**ANTES:**

```typescript
container.register('logger', () => new Logger(), {
  lifetime: ServiceLifetime.SINGLETON
});

container.register('database', (c) => new Database(c.resolve('config')), {
  lifetime: ServiceLifetime.SINGLETON
});

container.register('userRepository', (c) => new UserRepository(c.resolve('database')), {
  lifetime: ServiceLifetime.SINGLETON
});

container.register('userService', (c) => new UserService(
  c.resolve('userRepository'),
  c.resolve('eventBus')
), {
  lifetime: ServiceLifetime.SINGLETON
});
```

**DESPUÉS:**

```typescript
container.registerAll({
  logger: () => new Logger(),
  database: (c) => new Database(c.resolve('config')),
  userRepository: (c) => new UserRepository(c.resolve('database')),
  userService: (c) => new UserService(
    c.resolve('userRepository'),
    c.resolve('eventBus')
  )
});

// O aún mejor con auto-wiring
container.registerClass(Logger);
container.registerClass(Database);
container.registerClass(UserRepository);
container.registerClass(UserService);
```

**Reducción:** De 20 líneas a 4-8 líneas (60-80% menos código)

---

## 6. Plan de Migración

> **NOTA:** Como Stratix aún no está en producción (v0.x), **podemos hacer breaking changes** en cualquier fase. El plan se enfoca en implementación incremental por complejidad, no por compatibilidad.

### Fase 1: Fundamentos (Inmediato - v0.3.0)

**Objetivo:** Implementar métodos de conveniencia básicos.

**Cambios:**
- [ ] Agregar métodos a `Container` interface:
  - `singleton<T>(token, value | factory)`
  - `scoped<T>(token, factory)`
  - `transient<T>(token, factory)`
  - `registerAll(services)`
  - `tryResolve<T>(token)`

- [ ] Implementar en `AwilixContainer`
- [ ] Agregar tests completos
- [ ] **Migrar todos los plugins internos** a nueva API
- [ ] Actualizar documentación y ejemplos

**Breaking Changes:** ✅ **Permitidos**
- Cambiar default lifetime si es necesario
- Modificar firmas de métodos existentes si mejora la API

**Duración Estimada:** 1-2 días

---

### Fase 2: Auto-Wiring (v0.3.0 o v0.4.0)

**Objetivo:** Soporte completo para auto-wiring con Awilix nativo.

**Cambios:**
- [ ] Agregar `registerClass<T>(classType, options?)` a `Container`
- [ ] Implementar con `awilix.asClass()` y auto-wiring
- [ ] Soportar `injectionMode`: PROXY (default) y CLASSIC
- [ ] Agregar tests exhaustivos para auto-wiring
- [ ] Documentar convenciones de naming
- [ ] Crear guía de mejores prácticas
- [ ] **Refactorizar módulos internos** para usar auto-wiring

**Breaking Changes:** ✅ **Permitidos**
- Cambiar cómo se registran clases si es necesario
- Modificar comportamiento de resolución

**Duración Estimada:** 2-3 días

---

### Fase 3: API Avanzada de Awilix (v0.4.0 o v0.5.0)

**Objetivo:** Exponer capacidades avanzadas de Awilix para casos complejos.

**Cambios:**
- [ ] Agregar `registerAwilix(registrations)` para registro nativo
- [ ] Exponer `getAwilixContainer()` para acceso directo
- [ ] Documentar cuándo usar API simple vs avanzada
- [ ] Crear ejemplos de casos avanzados:
  - Inyección condicional
  - Proxies y decorators de Awilix
  - Lifetime personalizado
  - Resolución lazy

**Breaking Changes:** ✅ **Permitidos**
- Cambiar estructura interna del container si mejora performance

**Duración Estimada:** 1-2 días

---

### Fase 4: Optimización y Limpieza (v0.5.0+)

**Objetivo:** Optimizar, limpiar y preparar para estabilización.

**Cambios:**
- [ ] **Eliminar código deprecated** (no mantener backward compatibility)
- [ ] Optimizar performance de resolución
- [ ] Agregar benchmarks
- [ ] Refactorizar implementación interna si es necesario
- [ ] Simplificar API eliminando métodos redundantes
- [ ] Documentación final completa
- [ ] Migration guide para usuarios early adopters

**Breaking Changes:** ✅ **Permitidos y Esperados**
- Eliminar métodos deprecated
- Cambiar defaults si mejora DX
- Renombrar métodos si es más claro

**Duración Estimada:** 2-3 días

---

### Resumen del Plan

| Fase | Versión | Breaking Changes | Duración |
|------|---------|------------------|----------|
| 1. Fundamentos | v0.3.0 | ✅ Sí | 1-2 días |
| 2. Auto-Wiring | v0.3.0-v0.4.0 | ✅ Sí | 2-3 días |
| 3. API Avanzada | v0.4.0-v0.5.0 | ✅ Sí | 1-2 días |
| 4. Optimización | v0.5.0+ | ✅ Sí | 2-3 días |
| **Total** | - | - | **6-10 días** |

### Estrategia de Breaking Changes

**Principios:**
1. **Priorizar DX sobre compatibilidad** - Si un breaking change mejora significativamente la experiencia del desarrollador, hacerlo
2. **Documentar todos los cambios** - Mantener CHANGELOG.md actualizado
3. **Comunicar claramente** - Avisar en release notes sobre breaking changes
4. **Iterar rápido** - No esperar a v1.0 para hacer mejoras importantes

**Justificación:**
- Proyecto en v0.x (pre-release)
- Sin usuarios en producción
- Mejor hacer cambios ahora que después
- Permite experimentar con la mejor API posible

---

## 7. Comparación de Verbosidad

### Métrica: Líneas de Código

| Escenario | Antes | Después | Reducción |
|-----------|-------|---------|-----------|
| Plugin simple (3 servicios) | 3 líneas | 1 línea | 67% |
| Servicio con dependencias | 7 líneas | 1 línea | 86% |
| Mixed lifetimes (4 servicios) | 16 líneas | 4 líneas | 75% |
| Batch registration (4 servicios) | 20 líneas | 4 líneas | 80% |
| **Promedio** | - | - | **77%** |

### Métrica: Caracteres

| Escenario | Antes | Después | Reducción |
|-----------|-------|---------|-----------|
| Singleton simple | 82 chars | 45 chars | 45% |
| Con lifetime explícito | 95 chars | 45 chars | 53% |
| **Promedio** | - | - | **49%** |

---

## 8. Recomendaciones

### 8.1 Prioridad Alta

1. **Métodos de conveniencia** (`singleton`, `scoped`, `transient`)
   - Impacto: Alto
   - Complejidad: Baja
   - Breaking: No

2. **registerAll** para batch registration
   - Impacto: Alto
   - Complejidad: Baja
   - Breaking: No

3. **tryResolve** para resolución opcional
   - Impacto: Medio
   - Complejidad: Muy baja
   - Breaking: No

### 8.2 Prioridad Media

4. **registerClass** con auto-wiring básico
   - Impacto: Alto
   - Complejidad: Media
   - Breaking: No

5. **Exponer API de Awilix**
   - Impacto: Medio
   - Complejidad: Baja
   - Breaking: No

### 8.3 Prioridad Baja (Futuro)

6. **Fluent API** (bind/to pattern)
   - Impacto: Bajo (nice-to-have)
   - Complejidad: Alta
   - Breaking: No

7. **Injection modes** de Awilix (PROXY vs CLASSIC)
   - Impacto: Bajo
   - Complejidad: Baja
   - Breaking: No (opt-in)

---

## 9. Conclusión

La implementación actual de DI es **funcional pero verbosa**. Las propuestas de simplificación pueden reducir el código en **~77%** sin sacrificar funcionalidad.

### Beneficios Clave:

✅ **Menos boilerplate** - Código más conciso  
✅ **Mejor DX** - Más fácil de usar  
✅ **Backward compatible** - Sin breaking changes  
✅ **Flexible** - Múltiples niveles de abstracción  
✅ **Type-safe** - Mantiene seguridad de tipos  

### Próximos Pasos:

1. Revisar propuestas con el equipo
2. Implementar Fase 1 (métodos de conveniencia)
3. Actualizar documentación y ejemplos
4. Migrar plugins internos
5. Iterar basado en feedback

---

**Última actualización:** 2025-11-19  
**Versión del documento:** 1.0
