#!/usr/bin/env node

/**
 * Documentation Audit Script
 * Extracts and validates code examples from Docusaurus documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '../docs/website/docs');
const AUDIT_REPORT = path.join(__dirname, '../docs/website/AUDIT_REPORT.md');

// Track findings
const findings = {
    totalPages: 0,
    totalCodeBlocks: 0,
    issues: [],
    warnings: [],
    success: []
};

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(content, filePath) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        blocks.push({
            language: match[1] || 'unknown',
            code: match[2],
            file: filePath,
            line: content.substring(0, match.index).split('\n').length
        });
    }

    return blocks;
}

/**
 * Check for common issues in code examples
 */
function validateCodeBlock(block) {
    const issues = [];

    if (block.language === 'typescript') {
        // Check for @Inject decorator (Stratix doesn't use decorators)
        if (block.code.includes('@Inject')) {
            issues.push({
                type: 'ERROR',
                message: 'Uses @Inject decorator - Stratix uses constructor injection',
                file: block.file,
                line: block.line
            });
        }

        // Check for imports from non-existent packages
        const importRegex = /from ['"](@stratix\/[\w-]+)['"]/g;
        let importMatch;
        while ((importMatch = importRegex.exec(block.code)) !== null) {
            const pkg = importMatch[1];
            // List of valid packages
            const validPackages = [
                '@stratix/core',
                '@stratix/runtime',
                '@stratix/cli',
                '@stratix/testing',
                '@stratix/http-client',
                '@stratix/http-fastify',
                '@stratix/db-postgres',
                '@stratix/db-mongodb',
                '@stratix/db-redis',
                '@stratix/msg-rabbitmq',
                '@stratix/obs-opentelemetry',
                '@stratix/auth',
                '@stratix/ai-openai',
                '@stratix/ai-anthropic',
                '@stratix/di-awilix',
                '@stratix/validation-zod',
                '@stratix/errors'
            ];

            if (!validPackages.includes(pkg)) {
                issues.push({
                    type: 'WARNING',
                    message: `Imports from potentially non-existent package: ${pkg}`,
                    file: block.file,
                    line: block.line
                });
            }
        }

        // Check for common typos
        if (block.code.includes('EntityID') && !block.code.includes('EntityId')) {
            issues.push({
                type: 'WARNING',
                message: 'Uses EntityID instead of EntityId',
                file: block.file,
                line: block.line
            });
        }
    }

    return issues;
}

/**
 * Scan all markdown files
 */
function scanDocumentation() {
    const files = getAllMarkdownFiles(DOCS_DIR);

    findings.totalPages = files.length;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const blocks = extractCodeBlocks(content, file);

        findings.totalCodeBlocks += blocks.length;

        for (const block of blocks) {
            const issues = validateCodeBlock(block);

            if (issues.length > 0) {
                issues.forEach(issue => {
                    if (issue.type === 'ERROR') {
                        findings.issues.push(issue);
                    } else {
                        findings.warnings.push(issue);
                    }
                });
            } else if (block.language === 'typescript') {
                findings.success.push({
                    file: block.file,
                    line: block.line
                });
            }
        }
    }
}

/**
 * Get all markdown files recursively
 */
function getAllMarkdownFiles(dir) {
    const files = [];

    function traverse(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                traverse(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
    }

    traverse(dir);
    return files;
}

/**
 * Generate audit report
 */
function generateReport() {
    const report = `# Documentation Audit Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Pages Scanned**: ${findings.totalPages}
- **Total Code Blocks**: ${findings.totalCodeBlocks}
- **Errors Found**: ${findings.issues.length}
- **Warnings**: ${findings.warnings.length}
- **Valid Examples**: ${findings.success.length}

## Errors (${findings.issues.length})

${findings.issues.length === 0 ? '_No errors found_' : findings.issues.map(issue => `
### ${issue.file.replace(DOCS_DIR, '')}:${issue.line}

**Type**: ${issue.type}  
**Message**: ${issue.message}
`).join('\n')}

## Warnings (${findings.warnings.length})

${findings.warnings.length === 0 ? '_No warnings_' : findings.warnings.map(warning => `
### ${warning.file.replace(DOCS_DIR, '')}:${warning.line}

**Message**: ${warning.message}
`).join('\n')}

## Statistics by Section

${generateSectionStats()}

## Next Steps

${findings.issues.length > 0 ? '1. Fix all errors\n' : ''}${findings.warnings.length > 0 ? '2. Review warnings\n' : ''}3. Verify code examples compile
4. Test code examples run correctly
`;

    fs.writeFileSync(AUDIT_REPORT, report);
    console.log(`\nAudit report generated: ${AUDIT_REPORT}`);
}

/**
 * Generate statistics by section
 */
function generateSectionStats() {
    const sections = {};

    findings.success.forEach(item => {
        const section = item.file.split('/').slice(-2, -1)[0];
        sections[section] = (sections[section] || 0) + 1;
    });

    return Object.entries(sections)
        .sort((a, b) => b[1] - a[1])
        .map(([section, count]) => `- **${section}**: ${count} valid examples`)
        .join('\n');
}

// Run audit
console.log('Starting documentation audit...\n');
scanDocumentation();
generateReport();

console.log(`\n✅ Audit complete!`);
console.log(`   Pages: ${findings.totalPages}`);
console.log(`   Code blocks: ${findings.totalCodeBlocks}`);
console.log(`   Errors: ${findings.issues.length}`);
console.log(`   Warnings: ${findings.warnings.length}`);
