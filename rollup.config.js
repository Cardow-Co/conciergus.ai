const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');
const json = require('@rollup/plugin-json');
const pkg = require('./package.json');

// Shared external dependencies
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  // External OpenTelemetry modules that cause bundling issues
  '@opentelemetry/instrumentation',
  '@opentelemetry/auto-instrumentations-web',
  'require-in-the-middle'
];

// Shared plugins configuration
const getPlugins = () => [
  json(),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs({
    include: ['node_modules/**'],
    transformMixedEsModules: true
  }),
  typescript({ 
    tsconfig: './tsconfig.json',
    exclude: ['node_modules/**', '**/*.test.tsx', '**/*.test.ts']
  }),
  terser()
];

// Multiple entry points for AI SDK 5 optimized tree-shaking
module.exports = [
  // Main entry point
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Gateway entry point
  {
    input: 'src/gateway.ts',
    output: [
      { file: 'dist/gateway.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/gateway.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Enterprise entry point
  {
    input: 'src/enterprise.ts',
    output: [
      { file: 'dist/enterprise.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/enterprise.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Hooks entry point
  {
    input: 'src/hooks.ts',
    output: [
      { file: 'dist/hooks.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/hooks.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Components entry point
  {
    input: 'src/components.ts',
    output: [
      { file: 'dist/components.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/components.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  }
]; 