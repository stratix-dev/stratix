/**
 * Tipos de plugins segun su proposito.
 */
export enum PluginType {
  /**
   * Plugins de nucleo del framework.
   * Proveen funcionalidad esencial.
   * @example LoggerPlugin, ConfigPlugin, ContainerPlugin
   */
  CORE = 'core',

  /**
   * Plugins de infraestructura.
   * Conectan con recursos externos (DB, cache, queues).
   * @example PostgresPlugin, RedisPlugin, RabbitMQPlugin
   */
  INFRASTRUCTURE = 'infrastructure',

  /**
   * Plugins de integracion.
   * Conectan con servicios de terceros.
   * @example OpenAIPlugin, StripePlugin, SendGridPlugin
   */
  INTEGRATION = 'integration',

  /**
   * Plugins de extension.
   * Agregan funcionalidad adicional.
   * @example MetricsPlugin, TracingPlugin, AuditPlugin
   */
  EXTENSION = 'extension'
}
