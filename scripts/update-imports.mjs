#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const replacements = [
    { from: '@stratix/ext-postgres', to: '@stratix/db-postgres' },
    { from: '@stratix/ext-mongodb', to: '@stratix/db-mongodb' },
    { from: '@stratix/ext-redis', to: '@stratix/db-redis' },
    { from: '@stratix/ext-rabbitmq', to: '@stratix/msg-rabbitmq' },
    { from: '@stratix/ext-opentelemetry', to: '@stratix/obs-opentelemetry' },
    { from: '@stratix/ext-http-fastify', to: '@stratix/http-fastify' },
    { from: '@stratix/ext-validation-zod', to: '@stratix/validation-zod' },
    { from: '@stratix/ext-auth', to: '@stratix/auth' },
    { from: '@stratix/ext-errors', to: '@stratix/errors' },
    { from: '@stratix/ext-mappers', to: '@stratix/mappers' },
    { from: '@stratix/ext-migrations', to: '@stratix/migrations' },
    { from: '@stratix/ext-secrets', to: '@stratix/secrets' },
    { from: '@stratix/ext-ai-agents-openai', to: '@stratix/ai-openai' },
    { from: '@stratix/ext-ai-agents-anthropic', to: '@stratix/ai-anthropic' },
    { from: '@stratix/impl-di-awilix', to: '@stratix/di-awilix' },
    { from: '@stratix/impl-cqrs-inmemory', to: '@stratix/cqrs-inmemory' },
    { from: '@stratix/impl-logger-console', to: '@stratix/logger-console' },
    { from: '@stratix/impl-ai-agents', to: '@stratix/ai-runtime' },
];

console.log('Finding files to update...\n');

// Find all TypeScript, JavaScript, JSON, and Markdown files
const files = execSync('find packages docs -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \\) ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null || true', { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean);

console.log(`Found ${files.length} files to check\n`);

let totalReplacements = 0;

for (const file of files) {
    try {
        let content = readFileSync(file, 'utf-8');
        let modified = false;
        let fileReplacements = 0;

        for (const { from, to } of replacements) {
            const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);

            if (matches) {
                content = content.replace(regex, to);
                modified = true;
                fileReplacements += matches.length;
            }
        }

        if (modified) {
            writeFileSync(file, content);
            console.log(`✓ ${file} (${fileReplacements} replacements)`);
            totalReplacements += fileReplacements;
        }
    } catch (error) {
        console.error(`✗ Failed to process ${file}:`, error.message);
    }
}

console.log(`\n✓ Updated ${totalReplacements} references across ${files.length} files!`);
