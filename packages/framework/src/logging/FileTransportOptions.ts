export interface FileTransportOptions {
  /**
   * Path del archivo de log
   */
  filePath: string;

  /**
   * Rotar archivo cuando supere este tamaño (en bytes)
   * @default 10MB
   */
  maxSize?: number;

  /**
   * Número máximo de archivos rotados a mantener
   * @default 5
   */
  maxFiles?: number;

  /**
   * Append vs overwrite
   * @default true (append)
   */
  append?: boolean;
}
