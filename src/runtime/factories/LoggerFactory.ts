import { Logger } from '../../core/ports/Logger.js';

export interface LoggerFactory {
  /**
   * Crea un nuevo logger con un contexto opcional
   */
  create(context?: string): Logger;

  /**
   * Crea un child logger a partir de otro logger
   */
  child(parent: Logger, childContext: string): Logger;

  /**
   * Cierra todos los transports asociados
   */
  close(): Promise<void>;
}
