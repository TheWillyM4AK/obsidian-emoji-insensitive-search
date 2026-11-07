import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const { name, version } = JSON.parse(readFileSync('manifest.json', 'utf8'));

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['obsidian'],
  sourcemap: false,
  minify: false,
  banner: { js: `/* ${name} ${version} | MIT | No network requests. */` }
});
