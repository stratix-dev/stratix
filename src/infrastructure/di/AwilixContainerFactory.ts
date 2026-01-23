import { createContainer, InjectionMode } from 'awilix';
import { ContainerConfig, ContainerFactory } from '../../runtime/factories/ContainerFactory.js';
import { Container } from '../../core/ports/Container.js';
import { AwilixContainerAdapter } from './AwilixContainerAdapter.js';

export class AwilixContainerFactory implements ContainerFactory {
  create(config?: ContainerConfig): Container {
    const awilixContainer = createContainer({
      strict: config?.strict ?? true,
      injectionMode:
        config?.injectionMode === 'classic' ? InjectionMode.CLASSIC : InjectionMode.PROXY
    });

    return new AwilixContainerAdapter({ awilixContainer });
  }
}
