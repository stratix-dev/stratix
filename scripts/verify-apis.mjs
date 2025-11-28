#!/usr/bin/env node

/**
 * API Verification Script
 * Compares documented APIs with actual source code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const findings = {
    verified: [],
    missing: [],
    mismatch: []
};

// Core classes to verify
const coreAPIs = [
    {
        class: 'Entity',
        file: 'packages/core/src/core/Entity.ts',
        documented: ['id', 'createdAt', 'updatedAt', 'touch()', 'equals()']
    },
    {
        class: 'AggregateRoot',
        file: 'packages/core/src/core/AggregateRoot.ts',
        documented: ['addDomainEvent()', 'getDomainEvents()', 'clearDomainEvents()']
    },
    {
        class: 'ValueObject',
        file: 'packages/core/src/core/ValueObject.ts',
        documented: ['equals()', 'getEqualityComponents()']
    },
    {
        class: 'Result',
        file: 'packages/core/src/result/Result.ts',
        documented: ['isSuccess', 'isFailure', 'value', 'error', 'map()', 'flatMap()']
    },
    {
        class: 'HTTPClient',
        file: 'packages/plugins/http/client/src/HTTPClient.ts',
        documented: ['get()', 'post()', 'put()', 'patch()', 'delete()', 'head()', 'options()', 'request()']
    }
];

function verifyAPI(api) {
    const filePath = path.join(__dirname, '..', api.file);

    if (!fs.existsSync(filePath)) {
        findings.missing.push({
            class: api.class,
            reason: `File not found: ${api.file}`
        });
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    for (const member of api.documented) {
        const memberName = member.replace(/\(\)$/, '');

        // Check if member exists in source
        const patterns = [
            new RegExp(`get ${memberName}\\(`),
            new RegExp(`${memberName}\\s*\\(`),
            new RegExp(`${memberName}:\\s*`),
            new RegExp(`get ${memberName}\\(\\)`)
        ];

        const found = patterns.some(pattern => pattern.test(content));

        if (found) {
            findings.verified.push({
                class: api.class,
                member: member
            });
        } else {
            findings.mismatch.push({
                class: api.class,
                member: member,
                file: api.file
            });
        }
    }
}

console.log('Verifying API documentation against source code...\n');

for (const api of coreAPIs) {
    verifyAPI(api);
}

console.log(`✅ Verified: ${findings.verified.length}`);
console.log(`❌ Missing/Mismatch: ${findings.mismatch.length}`);
console.log(`⚠️  Files not found: ${findings.missing.length}\n`);

if (findings.mismatch.length > 0) {
    console.log('Mismatches found:');
    findings.mismatch.forEach(m => {
        console.log(`  - ${m.class}.${m.member} (${m.file})`);
    });
}

if (findings.missing.length > 0) {
    console.log('\nMissing files:');
    findings.missing.forEach(m => {
        console.log(`  - ${m.class}: ${m.reason}`);
    });
}

// Generate report
const report = `# API Verification Report

Generated: ${new Date().toISOString()}

## Summary

- **Verified**: ${findings.verified.length}
- **Mismatches**: ${findings.mismatch.length}
- **Missing Files**: ${findings.missing.length}

## Verified APIs (${findings.verified.length})

${findings.verified.map(v => `- ✅ ${v.class}.${v.member}`).join('\n')}

## Mismatches (${findings.mismatch.length})

${findings.mismatch.length === 0 ? '_No mismatches found_' : findings.mismatch.map(m => `- ❌ ${m.class}.${m.member}\n  File: ${m.file}`).join('\n')}

## Missing Files (${findings.missing.length})

${findings.missing.length === 0 ? '_All files found_' : findings.missing.map(m => `- ⚠️ ${m.class}: ${m.reason}`).join('\n')}
`;

fs.writeFileSync(path.join(__dirname, '../docs/website/API_VERIFICATION.md'), report);
console.log('\n✅ API verification report generated: docs/website/API_VERIFICATION.md');
