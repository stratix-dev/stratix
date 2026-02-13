import { DependencyLifetime } from '../../core/types/DependencyLifetime.js';

export enum InjectableType {
  CLASS = 'class',
  FUNCTION = 'function',
  VALUE = 'value',
  NONE = 'none'
}

export interface InjectableAnalysisResult {
  type: InjectableType;
  lifetime?: DependencyLifetime;
  reason: string;
}

export class InjectableAnalyzer {
  analyze(exportedItem: unknown, _exportName: string, filePath: string): InjectableAnalysisResult {
    if (this.isClass(exportedItem)) {
      return this.analyzeClass(filePath);
    }

    if (this.isFunction(exportedItem)) {
      return this.analyzeFunction(filePath);
    }

    if (this.isPlainObject(exportedItem)) {
      return this.analyzeValue(filePath);
    }

    return {
      type: InjectableType.NONE,
      reason: 'Unsupported export type'
    };
  }

  private isClass(item: unknown): boolean {
    return typeof item === 'function' && /^class\s/.test(item.toString());
  }

  private isFunction(item: unknown): boolean {
    return typeof item === 'function' && !/^class\s/.test(item.toString());
  }

  private isPlainObject(item: unknown): boolean {
    return typeof item === 'object' && item !== null && !Array.isArray(item);
  }

  private analyzeClass(filePath: string): InjectableAnalysisResult {
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Always injectable layers
    if (this.isInAlwaysInjectableLayer(normalizedPath)) {
      return {
        type: InjectableType.CLASS,
        lifetime: DependencyLifetime.SINGLETON,
        reason: `Injectable layer: ${this.getLayer(normalizedPath)}`
      };
    }

    // Domain: only *DomainService.ts
    if (normalizedPath.includes('/domain/')) {
      if (normalizedPath.endsWith('DomainService.ts') || normalizedPath.endsWith('DomainService.js')) {
        return {
          type: InjectableType.CLASS,
          lifetime: DependencyLifetime.SINGLETON,
          reason: 'Domain service pattern'
        };
      }

      return {
        type: InjectableType.NONE,
        reason: 'Domain entity/value object (not injectable)'
      };
    }

    return {
      type: InjectableType.NONE,
      reason: 'Unknown layer or pattern'
    };
  }

  private analyzeFunction(filePath: string): InjectableAnalysisResult {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.endsWith('.factory.ts') || normalizedPath.endsWith('.factory.js')) {
      return {
        type: InjectableType.FUNCTION,
        lifetime: DependencyLifetime.SINGLETON,
        reason: 'Factory function pattern'
      };
    }

    return {
      type: InjectableType.NONE,
      reason: 'Not a factory function'
    };
  }

  private analyzeValue(filePath: string): InjectableAnalysisResult {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (normalizedPath.endsWith('.config.ts') || normalizedPath.endsWith('.config.js')) {
      return {
        type: InjectableType.VALUE,
        reason: 'Configuration value'
      };
    }

    return {
      type: InjectableType.NONE,
      reason: 'Not a configuration value'
    };
  }

  private isInAlwaysInjectableLayer(filePath: string): boolean {
    return (
      filePath.includes('/infrastructure/') ||
      filePath.includes('/application/') ||
      filePath.includes('/app/')
    );
  }

  private getLayer(filePath: string): string {
    if (filePath.includes('/infrastructure/')) return 'infrastructure';
    if (filePath.includes('/application/')) return 'application';
    if (filePath.includes('/app/')) return 'app';
    if (filePath.includes('/domain/')) return 'domain';
    return 'unknown';
  }
}
