export interface ConfigurationSource {
  readonly name: string;
  load(): Promise<Record<string, unknown>>;
  isAvailable(): Promise<boolean>;
}
