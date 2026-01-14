import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { StratixApplication } from './StratixApplication.js';

export async function bootstrap(
  appClass: new (...args: any[]) => any
): Promise<StratixApplication> {
  const appMetadata = MetadataReader.getAppMetadata(appClass);
  if (!appMetadata) {
    throw new DecoratorMissingError('@StratixApp', appClass.name);
  }

  const registry = new MetadataRegistry(appClass);

  const app = new StratixApplication(appClass, registry);
  await app.initialize();
  return app;
}
