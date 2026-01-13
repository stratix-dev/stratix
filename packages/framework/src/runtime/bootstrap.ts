import { MetadataReader } from '../metadata/MetadataReader.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { StratixApplication } from './StratixApplication.js';

export async function bootstrap(
  appClass: new (...args: any[]) => any
): Promise<StratixApplication> {
  const appMetadata = MetadataReader.getAppMetadata(appClass);
  if (!appMetadata) {
    throw new Error(`@StratixApp decorator not found on ${appClass.name}`);
  }

  const registry = new MetadataRegistry(appClass);

  const app = new StratixApplication(appClass, registry);
  await app.initialize();
  return app;
}
