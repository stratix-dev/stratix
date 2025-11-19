#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const renames = [
    { old: '@stratix/ext-mongodb', new: '@stratix/db-mongodb', dir: 'db-mongodb' },
    { old: '@stratix/ext-redis', new: '@stratix/db-redis', dir: 'db-redis' },
    { old: '@stratix/ext-rabbitmq', new: '@stratix/msg-rabbitmq', dir: 'msg-rabbitmq' },
    { old: '@stratix/ext-opentelemetry', new: '@stratix/obs-opentelemetry', dir: 'obs-opentelemetry' },
    { old: '@stratix/ext-http-fastify', new: '@stratix/http-fastify', dir: 'http-fastify' },
    { old: '@stratix/ext-validation-zod', new: '@stratix/validation-zod', dir: 'validation-zod' },
    { old: '@stratix/ext-auth', new: '@stratix/auth', dir: 'auth' },
    { old: '@stratix/ext-errors', new: '@stratix/errors', dir: 'errors' },
    { old: '@stratix/ext-mappers', new: '@stratix/mappers', dir: 'mappers' },
    { old: '@stratix/ext-migrations', new: '@stratix/migrations', dir: 'migrations' },
    { old: '@stratix/ext-secrets', new: '@stratix/secrets', dir: 'secrets' },
    { old: '@stratix/ext-ai-agents-openai', new: '@stratix/ai-openai', dir: 'ai-openai' },
    { old: '@stratix/ext-ai-agents-anthropic', new: '@stratix/ai-anthropic', dir: 'ai-anthropic' },
    { old: '@stratix/impl-di-awilix', new: '@stratix/di-awilix', dir: 'di-awilix' },
    { old: '@stratix/impl-cqrs-inmemory', new: '@stratix/cqrs-inmemory', dir: 'cqrs-inmemory' },
    { old: '@stratix/impl-logger-console', new: '@stratix/logger-console', dir: 'logger-console' },
    { old: '@stratix/impl-ai-agents', new: '@stratix/ai-runtime', dir: 'ai-runtime' },
];

for (const { old, new: newName, dir } of renames) {
    const packagePath = join(process.cwd(), 'packages', dir, 'package.json');

    try {
        const content = readFileSync(packagePath, 'utf-8');
        const pkg = JSON.parse(content);

        // Update name
        pkg.name = newName;

        // Update repository directory if exists
        if (pkg.repository?.directory) {
            pkg.repository.directory = `packages/${dir}`;
        }

        writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`✓ Updated ${old} → ${newName}`);
    } catch (error) {
        console.error(`✗ Failed to update ${dir}:`, error.message);
    }
}

console.log('\n✓ All package.json files updated!');
