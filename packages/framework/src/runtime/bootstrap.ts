import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { MetadataKeys } from '../metadata/keys.js';
import { Metadata } from '../metadata/Metadata.js';
import { MetadataRegistry } from '../metadata/MetadataRegistry.js';
import { StratixApplication } from './StratixApplication.js';

export async function bootstrap(
  appClass: new (...args: any[]) => any
): Promise<StratixApplication> {
  // Type-safe metadata check with proper error
  if (!Metadata.has(appClass, MetadataKeys.App)) {
    throw new DecoratorMissingError('@StratixApp', appClass.name);
  }

  // After the check, TypeScript knows metadata exists
  // but we use getOrThrow for explicit guarantee
  const appMetadata = Metadata.getOrThrow(appClass, MetadataKeys.App);

  // Log startup info (metadata is fully typed)
  console.log(`Starting ${appMetadata.name} v${appMetadata.version}`);

  // Build registry from metadata graph
  const registry = new MetadataRegistry({ appClass });

  // Create application instance
  const app = new StratixApplication({ appClass, registry });
  await app.initialize();

  return app;
}
