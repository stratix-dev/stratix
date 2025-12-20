#!/usr/bin/env node

/**
 * Script para analizar la cobertura de documentación JSDoc en el proyecto
 */

const fs = require('fs');
const path = require('path');

// Excluir tests y node_modules
const excludePatterns = [
  '__tests__',
  'node_modules',
  '.test.ts',
  '.spec.ts'
];

function shouldExclude(filePath) {
  return excludePatterns.some(pattern => filePath.includes(pattern));
}

function hasJSDocCategory(content) {
  return /@category\s+/.test(content);
}

function hasJSDocComment(content) {
  return /\/\*\*[\s\S]*?\*\//.test(content);
}

function hasExportedClass(content) {
  return /export\s+(abstract\s+)?class\s+\w+/.test(content);
}

function hasExportedInterface(content) {
  return /export\s+interface\s+\w+/.test(content);
}

function hasExportedEnum(content) {
  return /export\s+enum\s+\w+/.test(content);
}

function hasExportedFunction(content) {
  return /export\s+(async\s+)?function\s+\w+/.test(content);
}

function hasPublicExports(content) {
  return hasExportedClass(content) || 
         hasExportedInterface(content) || 
         hasExportedEnum(content) ||
         hasExportedFunction(content);
}

function analyzeDirectory(dir, stats = {
  total: 0,
  withJSDoc: 0,
  withCategory: 0,
  withPublicExports: 0,
  indexFiles: 0,
  byPackage: {}
}) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExclude(fullPath)) {
        analyzeDirectory(fullPath, stats);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (shouldExclude(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      const isIndexFile = entry.name === 'index.ts';
      const hasPublicAPI = hasPublicExports(content);

      if (isIndexFile) {
        stats.indexFiles++;
        continue; // Skip index files
      }

      if (!hasPublicAPI) {
        continue; // Skip files without public exports
      }

      stats.total++;
      stats.withPublicExports++;

      if (hasJSDocComment(content)) {
        stats.withJSDoc++;
      }

      if (hasJSDocCategory(content)) {
        stats.withCategory++;
      }

      // Track by package
      const packageMatch = fullPath.match(/packages\/([^\/]+)/);
      if (packageMatch) {
        const pkg = packageMatch[1];
        if (!stats.byPackage[pkg]) {
          stats.byPackage[pkg] = {
            total: 0,
            withJSDoc: 0,
            withCategory: 0
          };
        }
        stats.byPackage[pkg].total++;
        if (hasJSDocComment(content)) stats.byPackage[pkg].withJSDoc++;
        if (hasJSDocCategory(content)) stats.byPackage[pkg].withCategory++;
      }
    }
  }

  return stats;
}

// Analyze the project
const projectRoot = path.join(__dirname, '..');
const packagesDir = path.join(projectRoot, 'packages');

console.log('🔍 Analizando cobertura de documentación JSDoc...\n');

const stats = analyzeDirectory(packagesDir);

// Calculate percentages
const jsDocPercent = ((stats.withJSDoc / stats.total) * 100).toFixed(1);
const categoryPercent = ((stats.withCategory / stats.total) * 100).toFixed(1);

// Display results
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 ESTADÍSTICAS GENERALES');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`📄 Total de archivos con API pública: ${stats.total}`);
console.log(`📝 Archivos con JSDoc:                 ${stats.withJSDoc} (${jsDocPercent}%)`);
console.log(`🏷️  Archivos con @category:            ${stats.withCategory} (${categoryPercent}%)`);
console.log(`📑 Archivos index.ts (excluidos):      ${stats.indexFiles}\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('📦 COBERTURA POR PAQUETE');
console.log('═══════════════════════════════════════════════════════════════\n');

Object.entries(stats.byPackage)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([pkg, data]) => {
    const jsDocPct = ((data.withJSDoc / data.total) * 100).toFixed(1);
    const catPct = ((data.withCategory / data.total) * 100).toFixed(1);
    
    console.log(`📦 ${pkg}:`);
    console.log(`   Total:     ${data.total} archivos`);
    console.log(`   JSDoc:     ${data.withJSDoc}/${data.total} (${jsDocPct}%)`);
    console.log(`   Category:  ${data.withCategory}/${data.total} (${catPct}%)`);
    console.log();
  });

console.log('═══════════════════════════════════════════════════════════════');
console.log('📈 PROGRESO DE DOCUMENTACIÓN');
console.log('═══════════════════════════════════════════════════════════════\n');

const barLength = 50;
const categoryBar = '█'.repeat(Math.round((stats.withCategory / stats.total) * barLength));
const categoryEmpty = '░'.repeat(barLength - categoryBar.length);

console.log(`Archivos categorizados: ${categoryPercent}%`);
console.log(`[${categoryBar}${categoryEmpty}] ${stats.withCategory}/${stats.total}\n`);

if (categoryPercent < 50) {
  console.log('⚠️  Cobertura baja - Se recomienda documentar más archivos');
} else if (categoryPercent < 80) {
  console.log('👍 Cobertura moderada - Continuar documentando');
} else {
  console.log('✅ Excelente cobertura de documentación!');
}

console.log('\n═══════════════════════════════════════════════════════════════\n');
