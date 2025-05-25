#!/usr/bin/env node

// AI SDK 5 Development Tools
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Check if package.json exists
const packagePath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packagePath)) {
  log.error('package.json not found. Please run this script from the project root.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Development tools
const devTools = {
  // Bundle analysis for AI SDK 5 tree-shaking
  async analyzeBundles() {
    log.header('📦 Bundle Analysis for AI SDK 5 Tree-Shaking');
    
    try {
      // Build the project first
      log.info('Building project...');
      execSync('npm run build', { stdio: 'inherit' });
      
      // Check if dist directory exists
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) {
        log.error('dist directory not found. Build may have failed.');
        return;
      }
      
      // Analyze bundle sizes
      const files = fs.readdirSync(distPath)
        .filter(file => file.endsWith('.js') || file.endsWith('.mjs'))
        .map(file => {
          const filePath = path.join(distPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
          };
        })
        .sort((a, b) => b.size - a.size);
      
      log.success('Bundle analysis complete:');
      console.table(files);
      
      // Check for AI SDK 5 specific optimizations
      const mainBundle = files.find(f => f.name.includes('index'));
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      
      log.info(`Total bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      if (mainBundle && mainBundle.size > 100 * 1024) { // 100KB threshold
        log.warning('Main bundle is larger than 100KB. Consider optimizing imports.');
      } else {
        log.success('Bundle size is optimized for AI SDK 5 tree-shaking.');
      }
      
      // Check for entry point optimization
      const entryPoints = ['index.js', 'gateway.js', 'enterprise.js', 'hooks.js', 'components.js'];
      const foundEntryPoints = entryPoints.filter(ep => 
        files.some(f => f.name.includes(ep.replace('.js', '')))
      );
      
      log.info(`Entry points found: ${foundEntryPoints.length}/${entryPoints.length}`);
      if (foundEntryPoints.length === entryPoints.length) {
        log.success('All AI SDK 5 entry points are properly built.');
      }
      
    } catch (error) {
      log.error(`Bundle analysis failed: ${error.message}`);
    }
  },

  // Check AI SDK 5 compatibility
  async checkAISDKCompatibility() {
    log.header('🔍 AI SDK 5 Alpha Compatibility Check');
    
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    // AI SDK 5 required packages
    const aiSDKPackages = {
      'ai': '^4.0.0-canary',
      '@ai-sdk/react': '^1.0.0-canary',
      '@ai-sdk/provider-utils': '^1.0.0-canary',
    };
    
    log.info('Checking AI SDK 5 package versions...');
    
    let compatibilityIssues = 0;
    
    for (const [pkg, expectedVersion] of Object.entries(aiSDKPackages)) {
      if (dependencies[pkg]) {
        const version = dependencies[pkg];
        if (version.includes('canary') || version.includes('alpha')) {
          log.success(`${pkg}: ${version} (compatible)`);
        } else {
          log.warning(`${pkg}: ${version} (may not be AI SDK 5 Alpha)`);
          compatibilityIssues++;
        }
      } else {
        log.error(`${pkg}: not found`);
        compatibilityIssues++;
      }
    }
    
    // Check React 19 compatibility
    if (dependencies.react) {
      const reactVersion = dependencies.react;
      if (reactVersion.includes('19') || reactVersion.includes('canary')) {
        log.success(`React: ${reactVersion} (React 19 compatible)`);
      } else {
        log.warning(`React: ${reactVersion} (consider upgrading to React 19 for full AI SDK 5 support)`);
      }
    }
    
    // Check TypeScript configuration
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      const compilerOptions = tsconfig.compilerOptions || {};
      
      log.info('Checking TypeScript configuration...');
      
      if (compilerOptions.jsx === 'react-jsx' || compilerOptions.jsx === 'react-jsxdev') {
        log.success('TypeScript JSX configuration is React 19 compatible');
      } else {
        log.warning('Consider updating TypeScript jsx configuration for React 19');
      }
      
      if (compilerOptions.moduleResolution === 'bundler' || compilerOptions.moduleResolution === 'node') {
        log.success('Module resolution supports AI SDK 5 imports');
      }
    }
    
    if (compatibilityIssues === 0) {
      log.success('AI SDK 5 Alpha compatibility check passed!');
    } else {
      log.warning(`Found ${compatibilityIssues} compatibility issue(s)`);
    }
  },

  // Performance benchmarks
  async runPerformanceBenchmarks() {
    log.header('⚡ Performance Benchmarks');
    
    try {
      // Run tests with performance reporting
      log.info('Running performance tests...');
      execSync('npm test -- --verbose --coverage=false', { stdio: 'inherit' });
      
      // Check test performance
      log.success('Performance tests completed');
      
      // Analyze performance metrics
      const performanceMetrics = {
        'Bundle Build Time': this.measureBuildTime(),
        'Test Execution Time': this.measureTestTime(),
        'Type Checking Time': this.measureTypeCheckTime(),
      };
      
      console.table(performanceMetrics);
      
    } catch (error) {
      log.error(`Performance benchmarks failed: ${error.message}`);
    }
  },

  // Measure build time
measureBuildTime() {
     const start = Date.now();
     try {
       execSync('npm run build', { stdio: 'pipe' });
       const duration = Date.now() - start;
       return `${(duration / 1000).toFixed(2)}s`;
     } catch (error) {
      log.error(`Build failed: ${error.message}`);
      return `Failed (${error.message})`;
     }
   },

  // Measure test time
  measureTestTime() {
    const start = Date.now();
    try {
      execSync('npm test -- --passWithNoTests --silent', { stdio: 'pipe' });
      const duration = Date.now() - start;
      return `${(duration / 1000).toFixed(2)}s`;
    } catch (error) {
      return 'Failed';
    }
  },

  // Measure type checking time
  measureTypeCheckTime() {
    const start = Date.now();
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      const duration = Date.now() - start;
      return `${(duration / 1000).toFixed(2)}s`;
    } catch (error) {
      return 'Failed';
    }
  },

  // Development environment health check
  async healthCheck() {
    log.header('🔧 Development Environment Health Check');
    
    const checks = [
      { name: 'Node.js version', check: () => process.version },
      { name: 'npm version', check: () => execSync('npm --version', { encoding: 'utf8' }).trim() },
      { name: 'TypeScript compiler', check: () => execSync('npx tsc --version', { encoding: 'utf8' }).trim() },
      { name: 'Jest test runner', check: () => execSync('npx jest --version', { encoding: 'utf8' }).trim() },
      { name: 'Build system', check: () => fs.existsSync('rollup.config.js') ? 'Rollup configured' : 'No build config' },
      { name: 'AI SDK mocks', check: () => fs.existsSync('src/test/mocks') ? 'Available' : 'Missing' },
    ];
    
    for (const check of checks) {
      try {
        const result = check.check();
        log.success(`${check.name}: ${result}`);
      } catch (error) {
        log.error(`${check.name}: Failed`);
      }
    }
    
    // Check for common issues
    log.info('Checking for common development issues...');
    
    // Check for conflicting packages
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    const conflicts = [
      { pkg: '@types/react', version: '18', issue: 'React 19 types may conflict' },
      { pkg: 'eslint', version: '8', issue: 'Consider upgrading to ESLint 9' },
    ];
    
    for (const conflict of conflicts) {
      if (dependencies[conflict.pkg] && dependencies[conflict.pkg].includes(conflict.version)) {
        log.warning(`${conflict.pkg}: ${conflict.issue}`);
      }
    }
  },

  // Clean development artifacts
  async clean() {
    log.header('🧹 Cleaning Development Artifacts');
    
    const dirsToClean = ['dist', 'coverage', 'node_modules/.cache'];
    const filesToClean = ['*.tsbuildinfo', '.eslintcache'];
    
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log.success(`Cleaned ${dir}`);
      }
    }
    
for (const filePattern of filesToClean) {
       try {
        const glob = require('glob');
        const files = glob.sync(filePattern);
        files.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
         log.success(`Cleaned ${filePattern}`);
       } catch (error) {
         // File doesn't exist, which is fine
       }
     }
    
    log.success('Development artifacts cleaned');
  },

  // AI SDK 5 development setup
  async setupAISDK5Dev() {
    log.header('🚀 AI SDK 5 Development Setup');
    
    // Check if already set up
    if (fs.existsSync('src/test/mocks/ai-sdk.mock.ts')) {
      log.success('AI SDK 5 development environment already set up');
      return;
    }
    
    log.info('Setting up AI SDK 5 development environment...');
    
    try {
      // Install additional dev dependencies for AI SDK 5
      const devDeps = [
        'jest-environment-jsdom',
        '@types/jest',
        'ts-node',
      ];
      
      log.info('Installing additional dev dependencies...');
      execSync(`npm install --save-dev ${devDeps.join(' ')}`, { stdio: 'inherit' });
      
      log.success('AI SDK 5 development environment setup complete');
      
      // Show next steps
      log.info('Next steps:');
      console.log('  1. Run tests: npm test');
      console.log('  2. Build project: npm run build');
      console.log('  3. Start development: npm run dev');
      
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
    }
  }
};

// Command line interface
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
    case 'bundle':
      await devTools.analyzeBundles();
      break;
    
    case 'compat':
    case 'compatibility':
      await devTools.checkAISDKCompatibility();
      break;
    
    case 'perf':
    case 'performance':
      await devTools.runPerformanceBenchmarks();
      break;
    
    case 'health':
    case 'check':
      await devTools.healthCheck();
      break;
    
    case 'clean':
      await devTools.clean();
      break;
    
    case 'setup':
      await devTools.setupAISDK5Dev();
      break;
    
    case 'all':
      await devTools.healthCheck();
      await devTools.checkAISDKCompatibility();
      await devTools.analyzeBundles();
      break;
    
    default:
      log.header('🛠️  AI SDK 5 Development Tools');
      console.log('Available commands:');
      console.log('  analyze     - Analyze bundle sizes and tree-shaking');
      console.log('  compat      - Check AI SDK 5 compatibility');
      console.log('  perf        - Run performance benchmarks');
      console.log('  health      - Development environment health check');
      console.log('  clean       - Clean development artifacts');
      console.log('  setup       - Set up AI SDK 5 development environment');
      console.log('  all         - Run all checks');
      console.log('');
      console.log('Usage: node scripts/dev-tools.js <command>');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = devTools; 