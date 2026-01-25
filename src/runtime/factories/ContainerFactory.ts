import { Container } from '../../core/ports/Container.js';

export interface ContainerConfig {
  strict?: boolean;
  injectionMode?: 'proxy' | 'classic';
}

export interface ContainerFactory {
  create(config?: ContainerConfig): Container;
}
