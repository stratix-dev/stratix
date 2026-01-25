import { PluginType } from '../types/PluginType.js';
import { Container } from './Container.js';
import { Logger } from './Logger.js';

export interface PluginConfig {
  [key: string]: unknown;
}

export interface Plugin {
  /** Metadata del plugin */
  readonly metadata: PluginMetadata;

  /** Configuracion del plugin (opcional) */
  configure?(config: PluginConfig): void | Promise<void>;

  /** Registrar dependencias en el container */
  register?(context: PluginContext): void | Promise<void>;

  /** Inicializar el plugin (conexiones, etc) */
  initialize?(context: PluginContext): void | Promise<void>;

  /** Iniciar servicios del plugin */
  start?(context: PluginContext): void | Promise<void>;

  /** Detener servicios del plugin */
  stop?(context: PluginContext): void | Promise<void>;

  /** Limpiar recursos */
  dispose?(context: PluginContext): void | Promise<void>;
}

export interface PluginMetadata {
  /** Nombre unico del plugin */
  name: string;

  /** Version semver */
  version: string;

  /** Tipo de plugin */
  type: PluginType;

  /** Descripcion */
  description?: string;

  /** Plugins requeridos (se cargan antes) */
  dependencies?: string[];

  /** Plugins opcionales (se cargan si estan disponibles) */
  optionalDependencies?: string[];

  /** Tags para categorizar */
  tags?: string[];

  /** Orden de prioridad (mayor = primero) */
  priority?: number;
}

export interface PluginContext {
  /** Container de DI */
  container: Container;

  /** Logger del plugin */
  logger: Logger;

  /** Configuracion del plugin */
  config: PluginConfig;

  /** Obtener servicio registrado */
  getService<T>(token: string | symbol): T;

  /** Registrar servicio */
  registerService<T>(token: string | symbol, service: T): void;

  /** Obtener otro plugin */
  getPlugin<T extends Plugin>(name: string): T | undefined;

  /** Emitir evento de plugin */
  emit(event: string, data?: unknown): void;

  /** Suscribirse a evento de plugin */
  on(event: string, handler: (data: unknown) => void): void;
}
