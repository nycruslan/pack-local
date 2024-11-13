import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node14',
  external: ['fs-extra', 'commander'],
  sourcemap: true,
  clean: true,
  minify: true,
  dts: true,
  onSuccess: 'cp README.md LICENSE dist/',
});
