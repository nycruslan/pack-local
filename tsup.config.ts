import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true, // Generates type declarations
  format: ['cjs', 'esm'], // CommonJS and ESModule formats
  target: 'node14', // Target environment for Node.js
  external: ['fs-extra', 'commander'], // Exclude dependencies from bundling
  minify: true,
});
