#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

// Get version from command line argument
const NEW_VERSION = process.argv[2];

if (!NEW_VERSION) {
  console.error('Error: Version argument required');
  console.error('Usage: node scripts/bump-versions.mjs <version>');
  console.error('Example: node scripts/bump-versions.mjs 0.4.1');
  process.exit(1);
}

// Packages to exclude from version updates
const EXCLUDED_PACKAGES = [];

// Find all package.json files in packages directory (excluding templates and node_modules)
// Recursively searches through subdirectories (e.g., plugins, integrations)
function findPackageFiles(dir) {
  const packages = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules' && item !== 'templates') {
      const packageJsonPath = join(fullPath, 'package.json');
      try {
        statSync(packageJsonPath);
        packages.push(packageJsonPath);
      } catch {
        // No package.json in this directory, search subdirectories
        packages.push(...findPackageFiles(fullPath));
      }
    }
  }

  return packages;
}

const packagesDir = resolve(process.cwd(), 'packages');
const packageFiles = findPackageFiles(packagesDir);

console.log(`Found ${packageFiles.length} packages\n`);

let updated = 0;
let skipped = 0;

for (const file of packageFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    const pkg = JSON.parse(content);
    const oldVersion = pkg.version;

    // Skip excluded packages
    if (EXCLUDED_PACKAGES.includes(pkg.name)) {
      console.log(`⊘ ${pkg.name}: ${oldVersion} (skipped - independent versioning)`);
      skipped++;
      continue;
    }

    // Update version
    pkg.version = NEW_VERSION;

    // Write back
    writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`✓ ${pkg.name}: ${oldVersion} → ${NEW_VERSION}`);
    updated++;
  } catch (error) {
    console.error(`✗ Failed to update ${file}:`, error.message);
  }
}

// Update version badge in main README.md
try {
  const readmePath = resolve(process.cwd(), 'README.md');
  let readmeContent = readFileSync(readmePath, 'utf8');

  // Update version badge
  const versionBadgeRegex = /\[!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d.]+-(orange|blue)\.svg\)\]/;
  const newVersionBadge = `[![Version](https://img.shields.io/badge/version-${NEW_VERSION}-orange.svg)]`;

  if (versionBadgeRegex.test(readmeContent)) {
    readmeContent = readmeContent.replace(versionBadgeRegex, newVersionBadge);
    writeFileSync(readmePath, readmeContent, 'utf8');
    console.log(`\n✓ Updated version badge in README.md to ${NEW_VERSION}`);
  } else {
    console.log(`\n⚠ Version badge not found in README.md`);
  }
} catch (error) {
  console.error(`\n✗ Failed to update README.md:`, error.message);
}

console.log(`\nSummary:`);
console.log(`  Updated: ${updated} packages`);
console.log(`  Skipped: ${skipped} packages`);
console.log(`  New version: ${NEW_VERSION}`);
