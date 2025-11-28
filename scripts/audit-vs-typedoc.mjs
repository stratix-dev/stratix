/**
 * Audit Docusaurus vs TypeDoc
 * Compares Docusaurus markdown content against TypeDoc JSON output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '../docs/website/docs');
const API_JSON = path.join(__dirname, '../docs/api.json');
const REPORT_FILE = path.join(__dirname, '../docs/website/API_AUDIT_REPORT.md');

// Load TypeDoc data
console.log('Loading TypeDoc data...');
if (!fs.existsSync(API_JSON)) {
    console.error('Error: docs/api.json not found. Run "npx typedoc --json docs/api.json" first.');
    process.exit(1);
}
const typeDocData = JSON.parse(fs.readFileSync(API_JSON, 'utf-8'));

// Build API Map
const apiMap = new Map();

// TypeDoc Kinds
const Kind = {
    Project: 1,
    Module: 2,
    Namespace: 4,
    Enum: 8,
    EnumMember: 16,
    Variable: 32,
    Function: 64,
    Class: 128,
    Interface: 256,
    Constructor: 512,
    Property: 1024,
    Method: 2048,
    CallSignature: 4096,
    IndexSignature: 8192,
    ConstructorSignature: 16384,
    Parameter: 32768,
    TypeLiteral: 65536,
    TypeParameter: 131072,
    Accessor: 262144,
    GetSignature: 524288,
    SetSignature: 1048576,
    TypeAlias: 4194304,
    Reference: 8388608
};

function traverseTypeDoc(node, parentName = '') {
    const name = node.name;
    let fullName = parentName ? `${parentName}.${name}` : name;

    // Handle package entry points which might look like "packages/core/src"
    // We want to simplify them or just traverse through them
    if (node.kind === Kind.Module || node.kind === Kind.Project) {
        // Don't add module names to the path if they are file paths
        if (name.includes('/')) {
            fullName = parentName;
        }
    }

    if (node.kind === Kind.Class || node.kind === Kind.Interface) {
        // If parent was a module (file path), we might want to just use the class name
        // or try to infer the package. For now, let's index by simple name AND full name
        apiMap.set(name, { type: 'Class/Interface', fullName: name, children: [] });
        // Also store with package prefix if we could determine it, but for now simple name is safer for matching docs
    }

    if (node.children) {
        node.children.forEach(child => {
            if (child.kind === Kind.Method || child.kind === Kind.Property) {
                // For methods, we want Class.method
                if (node.kind === Kind.Class || node.kind === Kind.Interface) {
                    const childFullName = `${node.name}.${child.name}`;
                    apiMap.set(childFullName, { type: 'Method/Property', fullName: childFullName, parent: node.name });

                    if (apiMap.has(node.name)) {
                        apiMap.get(node.name).children.push(child.name);
                    }
                }
            }
            traverseTypeDoc(child, fullName);
        });
    }
}

// Handle TypeDoc structure (it might be an object with 'children' or just an array)
if (typeDocData.children) {
    typeDocData.children.forEach(child => traverseTypeDoc(child));
} else {
    // Sometimes it's project root
    traverseTypeDoc(typeDocData);
}

console.log(`Mapped ${apiMap.size} API items.`);

// Scan Docusaurus
const findings = {
    mentionedButMissing: [],
    classCoverage: {}
};

function getAllMarkdownFiles(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...getAllMarkdownFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(fullPath);
        }
    }
    return files;
}

const docsFiles = getAllMarkdownFiles(DOCS_DIR);
console.log(`Scanning ${docsFiles.length} documentation pages...`);

const mentionedAPIs = new Set();

for (const file of docsFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(DOCS_DIR, file);

    // Regex to find potential API references like `MyClass`, `MyClass.method`, `method()`
    // This is heuristic.
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const code = match[0];
        // Look for Class.method or new Class()
        const classMethodRegex = /\b([A-Z][a-zA-Z0-9]+)\.([a-z][a-zA-Z0-9]+)\b/g;
        let cmMatch;
        while ((cmMatch = classMethodRegex.exec(code)) !== null) {
            const className = cmMatch[1];
            const methodName = cmMatch[2];
            const fullName = `${className}.${methodName}`;

            mentionedAPIs.add(fullName);

            // Check if exists
            if (!apiMap.has(fullName)) {
                // Check if class exists at least
                if (apiMap.has(className)) {
                    // Class exists, method might not
                    findings.mentionedButMissing.push({
                        file: relPath,
                        api: fullName,
                        reason: `Method '${methodName}' not found in class '${className}'`
                    });
                } else {
                    // Class doesn't exist - might be external or generic example
                    // We ignore these to reduce noise, or log as "Potential unknown class"
                }
            } else {
                // It exists, mark coverage
                if (!findings.classCoverage[className]) findings.classCoverage[className] = new Set();
                findings.classCoverage[className].add(methodName);
            }
        }
    }
}

// Generate Report
let report = `# API Audit Report (Docusaurus vs TypeDoc)

Generated: ${new Date().toISOString()}

## Summary
- **API Items Mapped**: ${apiMap.size}
- **Docs Pages Scanned**: ${docsFiles.length}
- **Potential Discrepancies**: ${findings.mentionedButMissing.length}

## Potential Discrepancies
_APIs mentioned in docs (code blocks) that were not found in TypeDoc export._

`;

if (findings.mentionedButMissing.length === 0) {
    report += "✅ No obvious discrepancies found.\n";
} else {
    // Group by file
    const byFile = {};
    findings.mentionedButMissing.forEach(f => {
        if (!byFile[f.file]) byFile[f.file] = [];
        byFile[f.file].push(f);
    });

    for (const [file, items] of Object.entries(byFile)) {
        report += `### ${file}\n`;
        items.forEach(item => {
            report += `- ⚠️ \`${item.api}\`: ${item.reason}\n`;
        });
        report += '\n';
    }
}

report += `
## API Coverage
_Classes mentioned in docs and which of their methods are documented/used._

`;

for (const [className, methods] of Object.entries(findings.classCoverage)) {
    const apiClass = apiMap.get(className);
    if (!apiClass) continue;

    const allMethods = apiClass.children || [];
    const usedMethods = Array.from(methods);
    const coverage = Math.round((usedMethods.length / Math.max(1, allMethods.length)) * 100);

    report += `### ${className} (${coverage}%)\n`;
    report += `- **Used in docs**: ${usedMethods.join(', ')}\n`;

    const unused = allMethods.filter(m => !usedMethods.includes(m));
    if (unused.length > 0) {
        report += `- **Available but unused**: ${unused.slice(0, 10).join(', ')}${unused.length > 10 ? '...' : ''}\n`;
    }
    report += '\n';
}

fs.writeFileSync(REPORT_FILE, report);
console.log(`Report generated at ${REPORT_FILE}`);
