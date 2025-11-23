#!/usr/bin/env node
/**
 * Custom build script for Stratix Copilot
 * Handles TensorFlow.js bundling with proper module resolution
 */

import { build } from '../../node_modules/.pnpm/node_modules/esbuild/lib/main.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

console.log(`Building Stratix Copilot (${production ? 'production' : 'development'})...`);

try {
  const result = await build({
    entryPoints: [join(__dirname, 'src/extension.ts')],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: join(__dirname, 'dist/extension.js'),
    external: ['vscode'],
    logLevel: 'info',
    resolveExtensions: ['.ts', '.js', '.json'],
    mainFields: ['module', 'main'],
    conditions: ['node'],
  });

  // Copy initial-knowledge.json
  const distRagDir = join(__dirname, 'dist', 'rag');
  if (!existsSync(distRagDir)) {
    mkdirSync(distRagDir, { recursive: true });
  }

  const sourceKnowledge = join(__dirname, 'src', 'rag', 'initial-knowledge.json');
  const destKnowledge = join(distRagDir, 'initial-knowledge.json');

  if (existsSync(sourceKnowledge)) {
    copyFileSync(sourceKnowledge, destKnowledge);
    console.log('✅ Copied initial-knowledge.json to dist/rag/');
  }

  // Copy media folder for chat participant icon
  const distMediaDir = join(__dirname, 'dist', 'media');
  const sourceMediaDir = join(__dirname, 'media');

  if (existsSync(sourceMediaDir)) {
    if (!existsSync(distMediaDir)) {
      mkdirSync(distMediaDir, { recursive: true });
    }

    const mediaIcon = join(sourceMediaDir, 'icon.png');
    const destMediaIcon = join(distMediaDir, 'icon.png');

    if (existsSync(mediaIcon)) {
      copyFileSync(mediaIcon, destMediaIcon);
      console.log('✅ Copied media/icon.png to dist/media/');
    }
  }

  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
