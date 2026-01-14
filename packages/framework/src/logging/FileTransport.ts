import { LogEntry, LogTransport } from '@stratix/core';
import * as fs from 'fs';
import path from 'path';

export interface FileTransportOptions {
  filePath: string;
  maxSize?: number;
  maxFiles?: number;
  append?: boolean;
}

export class FileTransport implements LogTransport {
  readonly name = 'file';
  private writeStream: fs.WriteStream;

  constructor(private readonly options: FileTransportOptions) {
    // Ensure directory exists
    const dir = path.dirname(options.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create write stream
    this.writeStream = fs.createWriteStream(options.filePath, {
      flags: (options.append ?? true) ? 'a' : 'w'
    });
  }

  write(entry: LogEntry): void {
    const line = JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      context: entry.context,
      ...entry.metadata
    });

    this.writeStream.write(line + '\n');

    // Check for rotation
    this.checkRotation();
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.writeStream.once('drain', resolve);
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeStream.end((err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private checkRotation(): void {
    const stats = fs.statSync(this.options.filePath);
    const maxSize = this.options.maxSize ?? 10 * 1024 * 1024; // 10MB default

    if (stats.size > maxSize) {
      this.rotate();
    }
  }

  private rotate(): void {
    this.writeStream.close();

    // Rotate existing files
    const maxFiles = this.options.maxFiles ?? 5;
    for (let i = maxFiles - 1; i >= 0; i--) {
      const oldPath = i === 0 ? this.options.filePath : `${this.options.filePath}.${i}`;
      const newPath = `${this.options.filePath}.${i + 1}`;

      if (fs.existsSync(oldPath)) {
        if (i === maxFiles - 1) {
          fs.unlinkSync(oldPath); // Delete oldest
        } else {
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    // Create new stream
    this.writeStream = fs.createWriteStream(this.options.filePath, { flags: 'w' });
  }
}
