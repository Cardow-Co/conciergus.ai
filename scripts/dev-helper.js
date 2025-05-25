#!/usr/bin/env node

/**
 * Development Helper Script
 * Quick commands for common development tasks
 */

const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const error = (message) => log(`❌ ${message}`, colors.red);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const title = (message) => log(`\n${message}`, colors.bright);

const commands = {
  'quick-check': {
    description: 'Run quick development checks (lint + format + test)',
    action: () => {
      title('🔍 Running quick development checks...');
      
      try {
        log('Running ESLint...');
        execSync('pnpm run lint', { stdio: 'inherit' });
        success('ESLint passed');
        
        log('\nChecking Prettier formatting...');
        execSync('pnpm run format', { stdio: 'inherit' });
        success('Prettier formatting passed');
        
        log('\nRunning tests...');
        execSync('pnpm test', { stdio: 'inherit' });
        success('Tests passed');
        
        success('\nAll quick checks passed! 🎉');
      } catch (err) {
        error('Quick checks failed. Please fix the issues above.');
        process.exit(1);
      }
    }
  },
  
  'clean-install': {
    description: 'Clean reinstall dependencies',
    action: () => {
      title('🧹 Clean install...');
      
      try {
        log('Removing node_modules and lock file...');
        execSync('rm -rf node_modules pnpm-lock.yaml', { stdio: 'inherit' });
        
        log('Installing fresh dependencies...');
        execSync('pnpm install', { stdio: 'inherit' });
        
        success('Clean install completed!');
      } catch (err) {
        error('Clean install failed');
        process.exit(1);
      }
    }
  },
  
  'full-test': {
    description: 'Run full test suite with coverage',
    action: () => {
      title('🧪 Running full test suite...');
      
      try {
        log('Running tests with coverage...');
        execSync('pnpm run test:coverage', { stdio: 'inherit' });
        
        log('\nRunning build to verify compilation...');
        execSync('pnpm run build', { stdio: 'inherit' });
        
        success('Full test suite completed!');
      } catch (err) {
        error('Full test suite failed');
        process.exit(1);
      }
    }
  },
  
  'docs-preview': {
    description: 'Build and serve documentation',
    action: () => {
      title('📚 Building and serving documentation...');
      
      try {
        log('Building documentation...');
        execSync('pnpm run docs:build', { stdio: 'inherit' });
        
        log('Starting documentation server...');
        info('Documentation will be available at http://localhost:3000');
        execSync('pnpm run docs:serve', { stdio: 'inherit' });
      } catch (err) {
        error('Documentation preview failed');
        process.exit(1);
      }
    }
  },
  
  'type-check': {
    description: 'Run TypeScript type checking',
    action: () => {
      title('📝 Running TypeScript type checking...');
      
      try {
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        success('TypeScript type checking passed!');
      } catch (err) {
        error('TypeScript type checking failed');
        process.exit(1);
      }
    }
  },
  
  'build-check': {
    description: 'Run build verification',
    action: () => {
      title('🏗️  Running build verification...');
      
      try {
        log('Building project...');
        execSync('pnpm run build', { stdio: 'inherit' });
        
        log('Analyzing bundle size...');
        try {
          execSync('pnpm run size', { stdio: 'inherit' });
        } catch (err) {
          warning('Bundle size analysis not available');
        }
        
        success('Build verification completed!');
      } catch (err) {
        error('Build verification failed');
        process.exit(1);
      }
    }
  },
  
  'security-check': {
    description: 'Run security audit',
    action: () => {
      title('🔒 Running security audit...');
      
      try {
        execSync('pnpm audit --prod', { stdio: 'inherit' });
        success('Security audit completed!');
      } catch (err) {
        warning('Security vulnerabilities found. Check output above.');
      }
    }
  },
  
  'pre-commit': {
    description: 'Run all pre-commit checks',
    action: () => {
      title('🚀 Running pre-commit checks...');
      
      try {
        commands['quick-check'].action();
        commands['type-check'].action();
        commands['build-check'].action();
        
        success('\nAll pre-commit checks passed! Ready to commit! 🎉');
      } catch (err) {
        error('Pre-commit checks failed');
        process.exit(1);
      }
    }
  },
  
  'dev-setup': {
    description: 'Setup development environment',
    action: () => {
      title('⚙️  Setting up development environment...');
      
      try {
        log('Installing dependencies...');
        execSync('pnpm install', { stdio: 'inherit' });
        
        log('Setting up git hooks...');
        execSync('npx husky install', { stdio: 'inherit' });
        
        log('Running initial build...');
        execSync('pnpm run build', { stdio: 'inherit' });
        
        success('Development environment setup completed!');
      } catch (err) {
        error('Development setup failed');
        process.exit(1);
      }
    }
  },
  
  'reset': {
    description: 'Reset development environment',
    action: () => {
      title('🔄 Resetting development environment...');
      
      try {
        commands['clean-install'].action();
        commands['dev-setup'].action();
        
        success('Development environment reset completed!');
      } catch (err) {
        error('Development environment reset failed');
        process.exit(1);
      }
    }
  }
};

function showHelp() {
  title('🛠️  Development Helper');
  log('\nAvailable commands:');
  
  Object.entries(commands).forEach(([name, config]) => {
    log(`  ${name.padEnd(15)} - ${config.description}`);
  });
  
  log('\nExamples:');
  log('  node scripts/dev-helper.js quick-check');
  log('  node scripts/dev-helper.js full-test');
  log('  node scripts/dev-helper.js docs-preview');
  
  log('\nPackage.json scripts:');
  log('  pnpm run dev:quick-check');
  log('  pnpm run dev:full-test'); 
  log('  pnpm run dev:clean-install');
}

function main() {
  const command = process.argv[2];
  
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  if (commands[command]) {
    commands[command].action();
  } else {
    error(`Unknown command: ${command}`);
    log('\nRun with --help to see available commands');
    process.exit(1);
  }
}

// Run the command if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { commands, showHelp }; 