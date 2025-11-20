#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname } from 'path';

// Find all tsconfig.json files in plugins
const tsconfigFiles = execSync(
    'find packages/plugins -name "tsconfig.json" -type f',
    { encoding: 'utf8' }
)
    .trim()
    .split('\n')
    .filter(f => f && !f.includes('node_modules'));

console.log(`Found ${tsconfigFiles.length} tsconfig.json files to update\n`);

for (const file of tsconfigFiles) {
    try {
        const content = readFileSync(file, 'utf8');
        const tsconfig = JSON.parse(content);

        // Calculate depth (how many levels deep from root)
        // packages/plugins/category/package/tsconfig.json = 4 levels
        const parts = file.split('/');
        const depth = parts.length - 1; // -1 for the filename itself
        const parentPath = '../'.repeat(depth) + 'tsconfig.base.json';

        if (tsconfig.extends && tsconfig.extends !== parentPath) {
            tsconfig.extends = parentPath;
            writeFileSync(file, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
            console.log(`✓ Updated ${file}`);
            console.log(`  extends: "${parentPath}"`);
        }
    } catch (error) {
        console.error(`✗ Failed to update ${file}:`, error.message);
    }
}

console.log('\n✓ All tsconfig.json files updated');
