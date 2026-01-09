export interface YamlSourceOptions {
  /**
   * Path to YAML file
   */
  filePath: string;

  /**
   * Optional: base path for resolving relative paths
   * @default process.cwd()
   */
  basePath?: string;

  /**
   * Optional: encoding
   * @default 'utf-8'
   */
  encoding?: BufferEncoding;
}
