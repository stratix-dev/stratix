const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Plugin to handle CDN imports
 * @type {import('esbuild').Plugin}
 */
const cdnImportsPlugin = {
    name: 'cdn-imports',
    setup(build) {
        // Mark CDN imports as external so they're not bundled
        build.onResolve({ filter: /^https?:\/\// }, (args) => {
            return { path: args.path, external: true };
        });
    },
};

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: 'esbuild-problem-matcher',
    setup(build) {
        build.onStart(() => {
            console.log('[watch] build started');
        });
        build.onEnd((result) => {
            result.errors.forEach(({ text, location }) => {
                console.error(`✘ [ERROR] ${text}`);
                if (location == null) return;
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log('[watch] build finished');
        });
    },
};

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.js',
        external: ['vscode'],
        logLevel: 'warning',
        plugins: [cdnImportsPlugin, esbuildProblemMatcherPlugin],
    });

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();

        // Copy initial-knowledge.json
        const distRagDir = path.join(__dirname, 'dist', 'rag');
        if (!fs.existsSync(distRagDir)) {
            fs.mkdirSync(distRagDir, { recursive: true });
        }
        fs.copyFileSync(
            path.join(__dirname, 'src', 'rag', 'initial-knowledge.json'),
            path.join(distRagDir, 'initial-knowledge.json')
        );
        console.log('✅ Copied initial-knowledge.json to dist/rag/');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
