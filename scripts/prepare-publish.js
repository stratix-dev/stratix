#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function findPackageJsonFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git') {
        continue;
      }
      findPackageJsonFiles(fullPath, files);
    } else if (entry === 'package.json') {
      files.push(fullPath);
    }
  }

  return files;
}

async function prepareForPublish() {
  const packageFiles = findPackageJsonFiles(join(rootDir, 'packages'))
    .filter(file => !file.includes('node_modules') && !file.includes('dist'));

  console.log('Preparing packages for publish...\n');

  let updatedCount = 0;

  for (const packageFile of packageFiles) {
    const packagePath = packageFile;
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    if (packageJson.private) {
      console.log(`Skipping private package: ${packageJson.name}`);
      continue;
    }

    let modified = false;

    const processWorkspaceDeps = (deps) => {
      if (!deps) return false;

      let changed = false;
      for (const [name, version] of Object.entries(deps)) {
        if (version.startsWith('workspace:')) {
          const targetVersion = packageJson.version;
          deps[name] = `^${targetVersion}`;
          changed = true;
          console.log(`  ${name}: ${version} -> ^${targetVersion}`);
        }
      }
      return changed;
    };

    console.log(`Processing ${packageJson.name}...`);

    if (processWorkspaceDeps(packageJson.dependencies)) modified = true;
    if (processWorkspaceDeps(packageJson.devDependencies)) modified = true;
    if (processWorkspaceDeps(packageJson.peerDependencies)) modified = true;

    if (modified) {
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      updatedCount++;
      console.log(`Updated ${packageJson.name}\n`);
    } else {
      console.log(`No workspace: references found\n`);
    }
  }

  console.log(`\nDone! Updated ${updatedCount} package(s)`);

  if (updatedCount > 0) {
    console.log('\nIMPORTANT: These changes should be reverted after publishing!');
    console.log('Run: git checkout packages/**/package.json');
  }
}

prepareForPublish().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
