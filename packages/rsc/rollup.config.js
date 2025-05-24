const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');
const pkg = require('./package.json');

// External dependencies that should not be bundled
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  'ai/rsc',
  'react/jsx-runtime',
  'react-server-dom-webpack',
  'server-only'
];

// Shared plugins configuration
const getPlugins = () => [
  resolve({
    browser: false, // RSC runs on server
    preferBuiltins: true,
    exportConditions: ['react-server', 'node', 'import']
  }),
  commonjs({
    include: ['node_modules/**'],
    transformMixedEsModules: true
  }),
  typescript({ 
    tsconfig: './tsconfig.json',
    exclude: ['node_modules/**', '**/*.test.tsx', '**/*.test.ts'],
    declaration: true,
    declarationDir: './dist',
    jsx: 'react-jsx',
    moduleResolution: 'bundler'
  }),
  terser()
];

// Multiple entry points for RSC optimized tree-shaking
module.exports = [
  // Main entry point
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true },
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Actions entry point
  {
    input: 'src/actions.ts',
    output: [
      { file: 'dist/actions.cjs.js', format: 'cjs', sourcemap: true },
      { file: 'dist/actions.esm.js', format: 'esm', sourcemap: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Components entry point
  {
    input: 'src/components.ts',
    output: [
      { file: 'dist/components.cjs.js', format: 'cjs', sourcemap: true },
      { file: 'dist/components.esm.js', format: 'esm', sourcemap: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Hooks entry point
  {
    input: 'src/hooks.ts',
    output: [
      { file: 'dist/hooks.cjs.js', format: 'cjs', sourcemap: true },
      { file: 'dist/hooks.esm.js', format: 'esm', sourcemap: true }
    ],
    external,
    plugins: getPlugins()
  }
]; 