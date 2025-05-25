const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const terser = require('@rollup/plugin-terser');
const json = require('@rollup/plugin-json');
const pkg = require('./package.json');

// Shared external dependencies for ESM/CJS builds
const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  // External OpenTelemetry modules that cause bundling issues
  '@opentelemetry/instrumentation',
  '@opentelemetry/auto-instrumentations-web',
  'require-in-the-middle'
];

// Global mappings for UMD builds
const globals = {
  'react': 'React',
  'react-dom': 'ReactDOM'
};

// Browser external dependencies (include Node.js built-ins)
const browserExternal = [
  ...Object.keys(globals),
  // Node.js built-ins that should be external for browser builds (events is polyfilled)
  'crypto',
  'os',
  'path',
  'fs',
  'util',
  'stream',
  'buffer',
  // Additional Node.js modules that cause issues in browser builds
  'http',
  'https',
  'net',
  'dns',
  'tls',
  'child_process'
];

// Shared plugins configuration
const getPlugins = (minify = true) => [
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
  ...(minify ? [terser()] : [])
];

// Browser-specific plugins for UMD/IIFE builds
const getBrowserPlugins = (minify = true) => [
  json(),
  resolve({
    browser: true,
    preferBuiltins: false,
    // Include dependencies for standalone browser builds
    resolveOnly: []
  }),
  commonjs({
    include: ['node_modules/**'],
    transformMixedEsModules: true
  }),
  typescript({ 
    tsconfig: './tsconfig.json',
    exclude: ['node_modules/**', '**/*.test.tsx', '**/*.test.ts']
  }),
  ...(minify ? [terser()] : [])
];

// Multiple entry points for AI SDK 5 optimized tree-shaking
module.exports = [
  // Main entry point - ESM/CJS
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true }
    ],
    external,
    plugins: getPlugins()
  },
  // Main entry point - UMD for CDN
  {
    input: 'src/index.ts',
    output: [
      { 
        file: 'dist/index.umd.js', 
        format: 'umd', 
        name: 'ConciergusChat',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      },
      { 
        file: 'dist/index.umd.min.js', 
        format: 'umd', 
        name: 'ConciergusChat',
        globals,
        sourcemap: true,
        inlineDynamicImports: true,
        plugins: [terser()]
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins(false)
  },
  // Main entry point - IIFE for standalone browser usage
  {
    input: 'src/index.ts',
    output: [
      { 
        file: 'dist/index.iife.js', 
        format: 'iife', 
        name: 'ConciergusChat',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      },
      { 
        file: 'dist/index.iife.min.js', 
        format: 'iife', 
        name: 'ConciergusChat',
        globals,
        sourcemap: true,
        inlineDynamicImports: true,
        plugins: [terser()]
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins(false)
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
  // Gateway entry point - UMD
  {
    input: 'src/gateway.ts',
    output: [
      { 
        file: 'dist/gateway.umd.js', 
        format: 'umd', 
        name: 'ConciergusGateway',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins()
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
  // Enterprise entry point - UMD
  {
    input: 'src/enterprise.ts',
    output: [
      { 
        file: 'dist/enterprise.umd.js', 
        format: 'umd', 
        name: 'ConciergusEnterprise',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins()
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
  // Hooks entry point - UMD
  {
    input: 'src/hooks.ts',
    output: [
      { 
        file: 'dist/hooks.umd.js', 
        format: 'umd', 
        name: 'ConciergusHooks',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins()
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
  },
  // Components entry point - UMD
  {
    input: 'src/components.ts',
    output: [
      { 
        file: 'dist/components.umd.js', 
        format: 'umd', 
        name: 'ConciergusComponents',
        globals,
        sourcemap: true,
        inlineDynamicImports: true
      }
    ],
    external: browserExternal,
    plugins: getBrowserPlugins()
  }
]; 