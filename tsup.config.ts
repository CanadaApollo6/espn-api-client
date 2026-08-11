import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    // tsup 8 injects the TS6-deprecated `baseUrl` option into its declaration worker.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'es2022',
  treeshake: true,
});
