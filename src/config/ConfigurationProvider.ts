export interface ConfigurationProvider {
  load(): Promise<void>;
  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, defaultValue: T): T;
  has(key: string): boolean;
  getAll(): Record<string, unknown>;
  getSection<T = Record<string, unknown>>(section: string): T | undefined;
}
