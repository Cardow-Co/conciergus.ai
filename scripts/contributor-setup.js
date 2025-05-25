#!/usr/bin/env node

/**
 * Contributor Setup Script for Conciergus Chat
 * 
 * This script helps new contributors set up their development environment
 * with guided steps, validation, and helpful tips.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

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

// Utility functions
const log = (message, color = colors.reset) => console.log(`${color}${message}${colors.reset}`);
const success = (message) => log(`✅ ${message}`, colors.green);
const error = (message) => log(`❌ ${message}`, colors.red);
const warning = (message) => log(`⚠️  ${message}`, colors.yellow);
const info = (message) => log(`ℹ️  ${message}`, colors.blue);
const step = (message) => log(`🔄 ${message}`, colors.cyan);

// Configuration
const REQUIRED_NODE_VERSION = '18.0.0';
const REQUIRED_PNPM_VERSION = '8.0.0';
const PROJECT_ROOT = process.cwd();

class ContributorSetup {
  constructor() {
    this.checks = [];
    this.setupSteps = [];
    this.isInteractive = process.stdout.isTTY;
  }

  async run() {
    try {
      log('\n🚀 Welcome to Conciergus Chat Contributor Setup!', colors.bright);
      log('This script will help you set up your development environment.\n');

      // Pre-flight checks
      await this.performChecks();
      
      // Environment setup
      await this.setupEnvironment();
      
      // Install dependencies
      await this.installDependencies();
      
      // Verify installation
      await this.verifyInstallation();
      
      // Setup development tools
      await this.setupDevelopmentTools();
      
      // Final setup
      await this.finalSetup();
      
      this.showSuccessMessage();
    } catch (err) {
      error(`Setup failed: ${err.message}`);
      process.exit(1);
    }
  }

  async performChecks() {
    step('Performing pre-flight checks...');

    // Check Node.js version
    try {
      const nodeVersion = process.version.slice(1);
      if (this.compareVersions(nodeVersion, REQUIRED_NODE_VERSION) < 0) {
        throw new Error(`Node.js ${REQUIRED_NODE_VERSION}+ required, found ${nodeVersion}`);
      }
      success(`Node.js ${nodeVersion} ✓`);
    } catch (err) {
      error('Node.js version check failed');
      throw err;
    }

    // Check pnpm
    try {
      const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
      if (this.compareVersions(pnpmVersion, REQUIRED_PNPM_VERSION) < 0) {
        warning(`pnpm ${pnpmVersion} found, ${REQUIRED_PNPM_VERSION}+ recommended`);
        info('Consider updating pnpm: npm install -g pnpm@latest');
      } else {
        success(`pnpm ${pnpmVersion} ✓`);
      }
    } catch (err) {
      error('pnpm not found - installing...');
      try {
        execSync('npm install -g pnpm', { stdio: 'inherit' });
        success('pnpm installed successfully');
      } catch (installErr) {
        throw new Error('Failed to install pnpm. Please install manually: npm install -g pnpm');
      }
    }

    // Check Git
    try {
      const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
      success(`${gitVersion} ✓`);
    } catch (err) {
      throw new Error('Git not found. Please install Git first.');
    }

    // Check if we're in the right directory
    if (!fs.existsSync(path.join(PROJECT_ROOT, 'package.json'))) {
      throw new Error('Please run this script from the project root directory');
    }

    success('Pre-flight checks completed!');
  }

  async setupEnvironment() {
    step('Setting up environment...');

    // Create .env.local if it doesn't exist
    const envLocalPath = path.join(PROJECT_ROOT, '.env.local');
    if (!fs.existsSync(envLocalPath)) {
      const envExamplePath = path.join(PROJECT_ROOT, '.env.example');
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envLocalPath);
        success('Created .env.local from .env.example');
        warning('Please update .env.local with your API keys for full functionality');
      }
    }

    // Setup git hooks if not already setup
    try {
      execSync('npx husky install', { stdio: 'inherit' });
      success('Git hooks installed');
    } catch (err) {
      warning('Failed to install git hooks - will continue anyway');
    }

    success('Environment setup completed!');
  }

  async installDependencies() {
    step('Installing dependencies...');

    try {
      execSync('pnpm install --frozen-lockfile', { 
        stdio: 'inherit',
        cwd: PROJECT_ROOT 
      });
      success('Dependencies installed successfully!');
    } catch (err) {
      throw new Error('Failed to install dependencies. Please check your internet connection and try again.');
    }
  }

  async verifyInstallation() {
    step('Verifying installation...');

    const verificationSteps = [
      {
        name: 'Build check',
        command: 'pnpm run build',
        timeout: 120000, // 2 minutes
      },
      {
        name: 'Lint check',
        command: 'pnpm run lint',
        timeout: 30000,
      },
      {
        name: 'Format check',
        command: 'pnpm run format',
        timeout: 30000,
      },
      {
        name: 'Test run',
        command: 'pnpm test',
        timeout: 60000,
      },
    ];

    for (const step of verificationSteps) {
      try {
        log(`  Checking ${step.name}...`);
        execSync(step.command, { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT,
          timeout: step.timeout 
        });
        success(`  ${step.name} passed`);
      } catch (err) {
        throw new Error(`${step.name} failed. Please check the output above.`);
      }
    }

    success('Installation verification completed!');
  }

  async setupDevelopmentTools() {
    step('Setting up development tools...');

    // Check if VS Code is available and offer to install extensions
    try {
      execSync('code --version', { stdio: 'pipe' });
      
      if (this.isInteractive) {
        log('\n📝 Recommended VS Code extensions:');
        log('  - TypeScript and JavaScript Language Features');
        log('  - ESLint');
        log('  - Prettier - Code formatter');
        log('  - React Snippets');
        log('  - GitLens');
        
        if (await this.askYesNo('Would you like to install recommended VS Code extensions?')) {
          await this.installVSCodeExtensions();
        }
      }
    } catch (err) {
      info('VS Code not detected - skipping extension setup');
    }

    // Create helpful development scripts
    await this.createDevelopmentHelpers();

    success('Development tools setup completed!');
  }

  async installVSCodeExtensions() {
    const extensions = [
      'ms-typescript.typescript',
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'bradlc.vscode-tailwindcss',
      'eamodio.gitlens',
    ];

    for (const extension of extensions) {
      try {
        execSync(`code --install-extension ${extension}`, { stdio: 'pipe' });
        success(`  Installed ${extension}`);
      } catch (err) {
        warning(`  Failed to install ${extension}`);
      }
    }
  }

  async createDevelopmentHelpers() {
    // Create a development helper script
    const devHelperPath = path.join(PROJECT_ROOT, 'scripts', 'dev-helper.js');
    const devHelperContent = `#!/usr/bin/env node

/**
 * Development Helper Script
 * Quick commands for common development tasks
 */

const { execSync } = require('child_process');

const commands = {
  'quick-check': () => {
    console.log('🔍 Running quick development checks...');
    execSync('pnpm run lint && pnpm run format && pnpm test', { stdio: 'inherit' });
  },
  'clean-install': () => {
    console.log('🧹 Clean install...');
    execSync('rm -rf node_modules pnpm-lock.yaml && pnpm install', { stdio: 'inherit' });
  },
  'full-test': () => {
    console.log('🧪 Running full test suite...');
    execSync('pnpm run test:coverage && pnpm run build', { stdio: 'inherit' });
  },
  'docs-preview': () => {
    console.log('📚 Building and serving documentation...');
    execSync('pnpm run docs:build && pnpm run docs:serve', { stdio: 'inherit' });
  },
};

const command = process.argv[2];
if (commands[command]) {
  commands[command]();
} else {
  console.log('Available commands:');
  Object.keys(commands).forEach(cmd => console.log(\`  - \${cmd}\`));
}
`;

    fs.writeFileSync(devHelperPath, devHelperContent);
    fs.chmodSync(devHelperPath, '755');
    success('Created development helper script');
  }

  async finalSetup() {
    step('Final setup...');

    // Create contributor info
    const contributorInfo = {
      setupDate: new Date().toISOString(),
      version: this.getPackageVersion(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    fs.writeFileSync(
      path.join(PROJECT_ROOT, '.contributor-setup.json'),
      JSON.stringify(contributorInfo, null, 2)
    );

    success('Final setup completed!');
  }

  showSuccessMessage() {
    log('\n🎉 Setup completed successfully!', colors.green + colors.bright);
    log('\n📖 Next steps:', colors.bright);
    log('  1. Read CONTRIBUTING.md for detailed guidelines');
    log('  2. Check out existing issues: https://github.com/conciergus/chat/issues');
    log('  3. Join our Discord community (link in README)');
    log('  4. Start with a good first issue labeled "good-first-issue"');
    
    log('\n🛠️  Useful commands:', colors.bright);
    log('  pnpm run dev          - Start development build');
    log('  pnpm test:watch       - Run tests in watch mode');
    log('  pnpm run docs:dev     - Start Storybook development');
    log('  node scripts/dev-helper.js quick-check - Quick development check');
    
    log('\n💡 Tips:', colors.bright);
    log('  - Use "pnpm changeset" for changes that affect the public API');
    log('  - Run "pnpm run lint:fix" before committing');
    log('  - Check .env.local and add your API keys for full functionality');
    
    log('\n🚀 Happy coding! Welcome to the Conciergus community!', colors.cyan);
  }

  // Utility methods
  compareVersions(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  getPackageVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
      return packageJson.version;
    } catch (err) {
      return 'unknown';
    }
  }

  async askYesNo(question) {
    if (!this.isInteractive) return false;
    
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      readline.question(`${question} (y/N): `, (answer) => {
        readline.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new ContributorSetup();
  setup.run().catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  });
}

module.exports = ContributorSetup; 