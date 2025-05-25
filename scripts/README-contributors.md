# Contributor Tools and Scripts

This directory contains automated tools and scripts designed to enhance the contributor experience for Conciergus Chat.

## 🛠️ Available Tools

### 1. Contributor Setup (`contributor-setup.js`)

Automated development environment setup for new contributors.

**Features:**
- ✅ Environment validation (Node.js, pnpm, Git)
- ✅ Dependency installation with verification
- ✅ Environment file creation (.env.local)
- ✅ Git hooks configuration (Husky)
- ✅ VS Code extension installation (optional)
- ✅ Development tool setup
- ✅ Build and test verification

**Usage:**
```bash
# Run setup with guided prompts
node scripts/contributor-setup.js

# Or use npm script
pnpm run contributor:setup
```

**What it does:**
1. Checks system requirements
2. Installs and verifies dependencies
3. Sets up development environment
4. Configures development tools
5. Runs validation checks
6. Creates helper scripts

### 2. Contributor Metrics (`contributor-metrics.js`)

Comprehensive metrics and dashboard system for tracking project health and contributions.

**Commands:**
```bash
# Interactive dashboard
node scripts/contributor-metrics.js dashboard
pnpm run contributor:dashboard

# Generate detailed report
node scripts/contributor-metrics.js report
pnpm run contributor:report

# Show contributor leaderboard
node scripts/contributor-metrics.js leaderboard

# Project health analysis
node scripts/contributor-metrics.js health
pnpm run contributor:health

# Collect fresh metrics data
node scripts/contributor-metrics.js collect

# Show trend analysis
node scripts/contributor-metrics.js trends
```

**Metrics Tracked:**
- 👥 **Contributors**: Total, active, new contributors
- 💻 **Codebase**: Files, lines, TypeScript usage, test coverage
- 🎯 **Activity**: Issues, PRs, release frequency
- 💚 **Health**: Overall project health score
- 🏆 **Recognition**: Contribution leaderboards

### 3. Development Helper (`dev-helper.js`)

Quick commands for common development tasks.

**Commands:**
```bash
# Quick development checks (lint + format + test)
node scripts/dev-helper.js quick-check
pnpm run dev:quick-check

# Clean reinstall dependencies
node scripts/dev-helper.js clean-install
pnpm run dev:clean-install

# Full test suite with coverage
node scripts/dev-helper.js full-test
pnpm run dev:full-test

# Build and serve documentation
node scripts/dev-helper.js docs-preview

# Show available commands
node scripts/dev-helper.js
pnpm run dev:helper
```

### 4. Build Documentation (`build-docs.js`)

Advanced documentation build system supporting MDX, TypeDoc, and website generation.

**Commands:**
```bash
# Build MDX documentation
node scripts/build-docs.js mdx

# Build complete documentation
node scripts/build-docs.js all

# Build documentation website
node scripts/build-docs.js website
```

### 5. Development Tools (`dev-tools.js`)

Comprehensive development utilities and project analysis tools.

**Commands:**
```bash
# Run all development tools
node scripts/dev-tools.js all

# Analyze project structure
node scripts/dev-tools.js analyze

# Check compatibility
node scripts/dev-tools.js compat

# Health check
node scripts/dev-tools.js health

# Setup development environment
node scripts/dev-tools.js setup
```

## 🚀 Quick Start Guide

### For New Contributors

1. **Clone and Setup:**
   ```bash
   git clone https://github.com/conciergus/chat.git
   cd chat
   pnpm run contributor:setup
   ```

2. **Start Development:**
   ```bash
   # View project dashboard
   pnpm run contributor:dashboard
   
   # Run quick checks
   pnpm run dev:quick-check
   
   # Start development server
   pnpm run dev
   ```

3. **Before Committing:**
   ```bash
   # Run comprehensive checks
   pnpm run dev:full-test
   
   # Generate changeset (if needed)
   pnpm changeset
   ```

### For Maintainers

1. **Project Health Monitoring:**
   ```bash
   # View comprehensive dashboard
   pnpm run contributor:dashboard
   
   # Generate detailed report
   pnpm run contributor:report
   
   # Check project health
   pnpm run contributor:health
   ```

2. **Contributor Recognition:**
   ```bash
   # View contributor leaderboard
   node scripts/contributor-metrics.js leaderboard
   
   # Generate contribution report
   pnpm run contributor:report
   ```

## 📊 Metrics and Reports

### Dashboard Features

The contributor dashboard provides real-time insights:

- **Repository Status**: Current version, branch, last commit
- **Project Health**: Overall score with category breakdown
- **Contributors**: Total, active, and new contributor counts
- **Codebase**: File counts, line counts, TypeScript usage
- **Activity**: Issue and PR statistics
- **Quick Actions**: Common development commands

### Report Generation

Detailed markdown reports include:

- Executive summary with key metrics
- Contributor analysis with rankings
- Codebase quality metrics
- Activity and engagement statistics
- Project health breakdown
- Actionable recommendations

Reports are saved in `scripts/reports/` directory.

### Health Scoring

Project health is calculated across five categories:

1. **Documentation** (85/100): Based on docs coverage
2. **Test Coverage** (78/100): From actual test metrics
3. **Code Quality** (92/100): Based on lint and type checks
4. **Activity** (88/100): Based on recent commits and PRs
5. **Community** (75/100): Based on contributor engagement

## 🔧 Development Workflow Integration

### Automated Checks

The tools integrate with our development workflow:

1. **Setup Phase**: `contributor-setup.js` ensures proper environment
2. **Development Phase**: `dev-helper.js` provides quick validation
3. **Pre-commit Phase**: Git hooks run automated checks
4. **PR Phase**: GitHub Actions run comprehensive validation
5. **Post-merge Phase**: Metrics collection and reporting

### CI/CD Integration

Our GitHub Actions workflows leverage these tools:

- **Contribution Validation**: Uses enhanced validation checks
- **Metrics Collection**: Automated metrics gathering
- **Report Generation**: Scheduled reporting
- **Health Monitoring**: Continuous project health tracking

## 📁 File Structure

```
scripts/
├── contributor-setup.js      # Automated setup for new contributors
├── contributor-metrics.js    # Metrics dashboard and reporting
├── dev-helper.js            # Development utility commands
├── dev-tools.js             # Advanced development tools
├── build-docs.js            # Documentation build system
├── generate-docs.js         # API documentation generation
├── reports/                 # Generated reports directory
└── README-contributors.md   # This file
```

## 🤝 Contributing to the Tools

These tools are part of the project and can be improved:

1. **Bug Reports**: Open issues for tool-related bugs
2. **Feature Requests**: Suggest improvements or new tools
3. **Pull Requests**: Contribute enhancements or fixes
4. **Documentation**: Help improve tool documentation

### Development Guidelines

When modifying these tools:

- Follow the existing code style
- Add comprehensive error handling
- Include helpful console output with colors
- Test on multiple platforms (macOS, Linux, Windows)
- Update documentation and help text
- Consider backward compatibility

## 📚 Additional Resources

- [Enhanced Contribution Workflow](../docs/guides/contribution-workflow.mdx)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Development Setup Guide](../docs/guides/development.md)
- [TypeScript Guide](../docs/guides/typescript-types.mdx)

---

**Need help?** Join our [Discord community](https://discord.gg/conciergus) or open a [GitHub Discussion](https://github.com/conciergus/chat/discussions)! 