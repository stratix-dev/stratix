#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Map of old paths to new paths
const pathMappings = {
    'packages/ai-openai': 'packages/plugins/ai/openai',
    'packages/ai-anthropic': 'packages/plugins/ai/anthropic',
    'packages/db-postgres': 'packages/plugins/database/postgres',
    'packages/db-mongodb': 'packages/plugins/database/mongodb',
    'packages/db-redis': 'packages/plugins/database/redis',
    'packages/http-fastify': 'packages/plugins/http/fastify',
    'packages/msg-rabbitmq': 'packages/plugins/messaging/rabbitmq',
    'packages/di-awilix': 'packages/plugins/di/awilix',
    'packages/obs-opentelemetry': 'packages/plugins/observability/opentelemetry',
    'packages/auth': 'packages/plugins/utilities/auth',
    'packages/errors': 'packages/plugins/utilities/errors',
    'packages/mappers': 'packages/plugins/utilities/mappers',
    'packages/migrations': 'packages/plugins/utilities/migrations',
    'packages/secrets': 'packages/plugins/utilities/secrets',
    'packages/validation-zod': 'packages/plugins/utilities/validation-zod',
};

// Find all package.json files
const packageFiles = execSync('find packages -name "package.json" -type f', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(f => !f.includes('node_modules'));

console.log(`Found ${packageFiles.length} package.json files to update\n`);

for (const file of packageFiles) {
    try {
        const content = readFileSync(file, 'utf8');
        const pkg = JSON.parse(content);

        let updated = false;

        // Update repository.directory field
        if (pkg.repository?.directory) {
            const oldDir = pkg.repository.directory;
            for (const [oldPath, newPath] of Object.entries(pathMappings)) {
                if (oldDir.includes(oldPath)) {
                    pkg.repository.directory = newPath;
                    updated = true;
                    console.log(`✓ ${pkg.name}: Updated repository.directory`);
                    console.log(`  ${oldDir} → ${newPath}`);
                    break;
                }
            }
        }

        if (updated) {
            writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        }
    } catch (error) {
        console.error(`✗ Failed to update ${file}:`, error.message);
    }
}

console.log('\n✓ All package.json files updated');
