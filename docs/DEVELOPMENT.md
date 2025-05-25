# Development Environment Setup

This guide will help you set up a complete development environment for contributing to Conciergus Chat.

## 🚀 Quick Setup

```bash
# Clone the repository
git clone https://github.com/your-username/conciergus.ai.git
cd conciergus.ai

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Build and test
pnpm run build
pnpm test

# Start development
pnpm run dev
```

## 📋 Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18.x, 20.x, or LTS | JavaScript runtime |
| **pnpm** | Latest | Package manager |
| **Git** | Latest | Version control |

### Recommended Software

| Tool | Purpose | Installation |
|------|---------|--------------|
| **VS Code** | IDE with excellent TypeScript support | [Download](https://code.visualstudio.com/) |
| **GitHub CLI** | Enhanced Git workflow | `brew install gh` or [Download](https://cli.github.com/) |
| **Docker** | Containerized testing (optional) | [Download](https://www.docker.com/) |

## 🔧 Detailed Setup

### 1. Node.js Installation

#### Option A: Using Node Version Manager (Recommended)

```bash
# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.bashrc  # or ~/.zshrc

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node
```

#### Option B: Direct Installation

Download from [nodejs.org](https://nodejs.org/) and install the LTS version.

### 2. pnpm Installation

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

### 3. Repository Setup

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/conciergus.ai.git
cd conciergus.ai

# Add upstream remote
git remote add upstream https://github.com/original-owner/conciergus.ai.git

# Verify remotes
git remote -v
```

### 4. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your values
# For VS Code users:
code .env.local

# For vim users:
vim .env.local
```

#### Required Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional but recommended for development
DEBUG=true
LOG_LEVEL=debug
NODE_ENV=development

# For testing research features
PERPLEXITY_API_KEY=your_perplexity_key_here
```

#### Getting API Keys

1. **Anthropic Claude API**:
   - Visit [console.anthropic.com](https://console.anthropic.com/)
   - Create an account and get your API key
   - Add billing information if needed

2. **OpenAI API**:
   - Visit [platform.openai.com](https://platform.openai.com/)
   - Create an account and generate an API key
   - Set up billing if required

3. **Perplexity AI** (Optional):
   - Visit [perplexity.ai](https://www.perplexity.ai/)
   - Get API access for research features

### 5. Initial Build and Test

```bash
# Install all dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test

# Check code style
pnpm run lint
pnpm run format

# Check bundle sizes
pnpm run size
```

## 🛠️ IDE Configuration

### VS Code Setup

#### Required Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true,
    "**/coverage": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/docs/api": true
  }
}
```

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache", "--no-coverage"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    },
    {
      "name": "Debug Current Test File",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${relativeFile}", "--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
```

### Other IDEs

#### WebStorm/IntelliJ IDEA

1. Install Node.js plugin
2. Enable ESLint and Prettier
3. Configure TypeScript service
4. Set up run configurations for npm scripts

#### Vim/Neovim

Consider using:
- **CoC (Conquer of Completion)** for TypeScript support
- **ALE** for linting
- **Prettier** plugin for formatting

## 🧪 Development Workflow

### Daily Development

```bash
# Start of day - sync with upstream
git checkout main
git pull upstream main
git push origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Start development mode
pnpm run dev

# In another terminal, run tests in watch mode
pnpm test:watch
```

### Making Changes

```bash
# Run linting and formatting
pnpm run lint:fix
pnpm run format:fix

# Run tests
pnpm test

# Check build
pnpm run build

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test -- ChatWidget.test.tsx

# Run tests matching pattern
pnpm test -- --testNamePattern="should render"
```

## 📦 Package Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm run build` | Build all packages for production |
| `pnpm run dev` | Build in watch mode |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Generate coverage report |
| `pnpm run lint` | Check code style |
| `pnpm run lint:fix` | Fix linting issues |
| `pnpm run format` | Check formatting |
| `pnpm run format:fix` | Fix formatting |
| `pnpm run size` | Check bundle sizes |
| `pnpm run docs:dev` | Start Storybook |
| `pnpm run docs:build` | Build documentation |
| `pnpm changeset` | Create changeset for release |

## 🔄 Git Workflow

### Branch Naming

```
feature/add-chat-widget
fix/message-rendering-bug
docs/update-api-reference
refactor/simplify-context-api
chore/update-dependencies
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new chat widget component
fix: resolve message rendering issue
docs: update API documentation
style: format code with prettier
refactor: simplify context API
test: add unit tests for chat hooks
chore: update dependencies
```

### Pull Request Process

1. **Create Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Implement your feature/fix
3. **Test**: Ensure all tests pass
4. **Commit**: Follow conventional commit format
5. **Push**: `git push origin feature/your-feature`
6. **Create PR**: Use GitHub interface
7. **Review**: Address feedback
8. **Merge**: Squash and merge when approved

## 🐛 Troubleshooting

### Common Issues

#### Node Version Problems

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
pnpm install
```

#### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Clear TypeScript cache
rm -rf node_modules/.cache
pnpm run build
```

#### Test Failures

```bash
# Clear Jest cache
pnpm test -- --clearCache

# Run tests with verbose output
pnpm test -- --verbose

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand test-file.test.ts
```

#### Build Issues

```bash
# Clean build directory
rm -rf dist

# Rebuild from scratch
pnpm run build

# Check for circular dependencies
pnpm run build --verbose
```

### Getting Help

1. **Documentation**: Check [docs/](../docs/) directory
2. **Issues**: Search [GitHub Issues](https://github.com/your-repo/issues)
3. **Discussions**: Use [GitHub Discussions](https://github.com/your-repo/discussions)
4. **Discord**: Join our development channel
5. **Email**: [hello@conciergus.ai](mailto:hello@conciergus.ai)

## 🎯 Next Steps

After setting up your environment:

1. **Read the [Contributing Guide](../CONTRIBUTING.md)**
2. **Check out [Good First Issues](https://github.com/your-repo/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**
3. **Join our [Discord community](https://discord.gg/your-invite)**
4. **Review the [Code of Conduct](../CODE_OF_CONDUCT.md)**

Happy coding! 🚀 