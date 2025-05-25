import {Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs} from "react/jsx-runtime";
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    hr: "hr",
    li: "li",
    ol: "ol",
    p: "p",
    pre: "pre",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return _jsxs(_Fragment, {
    children: [_jsx(_components.h1, {
      children: "Enhanced Contribution Workflow"
    }), "\n", _jsx(_components.p, {
      children: "This guide covers the enhanced contribution system for Conciergus Chat, including automated setup, validation, and metrics tracking."
    }), "\n", _jsx(_components.h2, {
      children: "🚀 Quick Start for New Contributors"
    }), "\n", _jsx(_components.h3, {
      children: "1. Initial Setup"
    }), "\n", _jsx(_components.p, {
      children: "Clone the repository and run our automated setup:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "git clone https://github.com/conciergus/chat.git\ncd chat\nnode scripts/contributor-setup.js\n"
      })
    }), "\n", _jsx(_components.p, {
      children: "The setup script will:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "✅ Verify Node.js and pnpm versions"
      }), "\n", _jsx(_components.li, {
        children: "✅ Install dependencies"
      }), "\n", _jsx(_components.li, {
        children: "✅ Set up environment files"
      }), "\n", _jsx(_components.li, {
        children: "✅ Configure git hooks"
      }), "\n", _jsx(_components.li, {
        children: "✅ Install VS Code extensions (optional)"
      }), "\n", _jsx(_components.li, {
        children: "✅ Run validation checks"
      }), "\n", _jsx(_components.li, {
        children: "✅ Create development helpers"
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "2. Understanding the Workflow"
    }), "\n", _jsx(_components.p, {
      children: "Our contribution process includes several automated validation stages:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-mermaid",
        children: "graph TD\n    A[Fork & Clone] --> B[Run Setup Script]\n    B --> C[Create Feature Branch]\n    C --> D[Develop & Test]\n    D --> E[Create Pull Request]\n    E --> F[Automated Validation]\n    F --> G{Validation Passed?}\n    G -->|Yes| H[Code Review]\n    G -->|No| I[Fix Issues]\n    I --> F\n    H --> J[Merge]\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "🛠️ Development Tools"
    }), "\n", _jsx(_components.h3, {
      children: "Contributor Setup Script"
    }), "\n", _jsxs(_components.p, {
      children: ["The automated setup script (", _jsx(_components.code, {
        children: "scripts/contributor-setup.js"
      }), ") provides:"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Features:"
      })
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Environment validation"
      }), "\n", _jsx(_components.li, {
        children: "Dependency installation"
      }), "\n", _jsx(_components.li, {
        children: "Development tool configuration"
      }), "\n", _jsx(_components.li, {
        children: "VS Code extension installation"
      }), "\n", _jsx(_components.li, {
        children: "Git hooks setup"
      }), "\n", _jsx(_components.li, {
        children: "Verification checks"
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Usage:"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "node scripts/contributor-setup.js\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Development Helper"
    }), "\n", _jsxs(_components.p, {
      children: ["Quick development commands (", _jsx(_components.code, {
        children: "scripts/dev-helper.js"
      }), "):"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Quick quality checks\nnode scripts/dev-helper.js quick-check\n\n# Clean reinstall\nnode scripts/dev-helper.js clean-install\n\n# Full test suite\nnode scripts/dev-helper.js full-test\n\n# Documentation preview\nnode scripts/dev-helper.js docs-preview\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Contributor Metrics Dashboard"
    }), "\n", _jsxs(_components.p, {
      children: ["Track project health and contributions (", _jsx(_components.code, {
        children: "scripts/contributor-metrics.js"
      }), "):"]
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Interactive dashboard\nnode scripts/contributor-metrics.js dashboard\n\n# Generate detailed report\nnode scripts/contributor-metrics.js report\n\n# View contributor leaderboard\nnode scripts/contributor-metrics.js leaderboard\n\n# Project health analysis\nnode scripts/contributor-metrics.js health\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "🔍 Automated Validation System"
    }), "\n", _jsx(_components.h3, {
      children: "Pull Request Validation"
    }), "\n", _jsx(_components.p, {
      children: "When you open a PR, our enhanced validation system automatically:"
    }), "\n", _jsxs(_components.h4, {
      children: ["1. ", _jsx(_components.strong, {
        children: "Contribution Analysis"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Analyzes changed files (code, docs, tests)"
      }), "\n", _jsx(_components.li, {
        children: "Determines contribution type"
      }), "\n", _jsx(_components.li, {
        children: "Checks if changeset is needed"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["2. ", _jsx(_components.strong, {
        children: "PR Structure Validation"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Validates conventional commit format in title"
      }), "\n", _jsx(_components.li, {
        children: "Ensures required sections in description"
      }), "\n", _jsx(_components.li, {
        children: "Checks for proper documentation"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["3. ", _jsx(_components.strong, {
        children: "Code Quality Checks"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Enhanced ESLint analysis"
      }), "\n", _jsx(_components.li, {
        children: "Prettier formatting validation"
      }), "\n", _jsx(_components.li, {
        children: "TypeScript strict checks"
      }), "\n", _jsx(_components.li, {
        children: "Code smell detection"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["4. ", _jsx(_components.strong, {
        children: "Test Coverage Analysis"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Runs comprehensive test suite"
      }), "\n", _jsx(_components.li, {
        children: "Analyzes coverage metrics"
      }), "\n", _jsx(_components.li, {
        children: "Uploads coverage reports"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["5. ", _jsx(_components.strong, {
        children: "Documentation Validation"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Builds documentation"
      }), "\n", _jsx(_components.li, {
        children: "Checks for broken links"
      }), "\n", _jsx(_components.li, {
        children: "Validates TypeDoc comments"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["6. ", _jsx(_components.strong, {
        children: "Performance Impact"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Analyzes bundle size changes"
      }), "\n", _jsx(_components.li, {
        children: "Checks for performance regressions"
      }), "\n", _jsx(_components.li, {
        children: "Monitors resource usage"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["7. ", _jsx(_components.strong, {
        children: "Security Validation"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Security audit checks"
      }), "\n", _jsx(_components.li, {
        children: "Anti-pattern detection"
      }), "\n", _jsx(_components.li, {
        children: "Vulnerability scanning"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["8. ", _jsx(_components.strong, {
        children: "Contribution Summary"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Generates automated feedback"
      }), "\n", _jsx(_components.li, {
        children: "Provides improvement suggestions"
      }), "\n", _jsx(_components.li, {
        children: "Welcomes first-time contributors"
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "📋 Contribution Requirements"
    }), "\n", _jsx(_components.h3, {
      children: "PR Title Format"
    }), "\n", _jsx(_components.p, {
      children: "Use conventional commit format:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        children: "feat: add new feature\nfix: resolve bug in component\ndocs: update API documentation\nrefactor: improve code structure\ntest: add unit tests\nchore: update dependencies\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "PR Description Template"
    }), "\n", _jsx(_components.p, {
      children: "Your PR must include these sections:"
    }), "\n", _jsxs(_components.h4, {
      children: ["✅ ", _jsx(_components.strong, {
        children: "Description"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Clear summary of changes"
      }), "\n", _jsx(_components.li, {
        children: "Problem being solved"
      }), "\n", _jsx(_components.li, {
        children: "Solution approach"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["✅ ", _jsx(_components.strong, {
        children: "Testing"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Test coverage added/updated"
      }), "\n", _jsx(_components.li, {
        children: "Manual testing performed"
      }), "\n", _jsx(_components.li, {
        children: "Verification steps"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["✅ ", _jsx(_components.strong, {
        children: "Checklist"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "[ ] Code follows style guidelines"
      }), "\n", _jsx(_components.li, {
        children: "[ ] Self-review completed"
      }), "\n", _jsx(_components.li, {
        children: "[ ] Documentation updated"
      }), "\n", _jsx(_components.li, {
        children: "[ ] Tests added/updated"
      }), "\n", _jsx(_components.li, {
        children: "[ ] Changeset added (if needed)"
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Changeset Requirements"
    }), "\n", _jsx(_components.p, {
      children: "For public API changes, add a changeset:"
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "pnpm changeset\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Changeset Guidelines:"
      })
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "patch"
        }), ": Bug fixes, non-breaking changes"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "minor"
        }), ": New features, non-breaking additions"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "major"
        }), ": Breaking changes"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "🎯 Quality Standards"
    }), "\n", _jsx(_components.h3, {
      children: "Code Quality"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "TypeScript"
        }), ": All new code must use TypeScript"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Testing"
        }), ": Maintain >80% test coverage"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Linting"
        }), ": Zero ESLint warnings"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Formatting"
        }), ": Use Prettier for consistent formatting"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Documentation"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "JSDoc"
        }), ": All public APIs must have JSDoc comments"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Guides"
        }), ": Update relevant documentation"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Examples"
        }), ": Provide usage examples for new features"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Performance"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Bundle Size"
        }), ": Monitor and minimize impact"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Memory"
        }), ": Avoid memory leaks"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Rendering"
        }), ": Optimize React component performance"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "🏆 Contributor Recognition"
    }), "\n", _jsx(_components.h3, {
      children: "Metrics Tracking"
    }), "\n", _jsx(_components.p, {
      children: "We track and celebrate contributions through:"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Commit Leaderboard"
        }), ": Top contributors by commits"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Quality Metrics"
        }), ": Code quality contributions"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Documentation"
        }), ": Documentation improvements"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Community"
        }), ": Issue responses and discussions"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Recognition Levels"
    }), "\n", _jsxs(_components.h4, {
      children: ["🥉 ", _jsx(_components.strong, {
        children: "First Contribution"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "Automatic welcome message"
      }), "\n", _jsx(_components.li, {
        children: "Guidance and support"
      }), "\n", _jsx(_components.li, {
        children: "Good first issue recommendations"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["🥈 ", _jsx(_components.strong, {
        children: "Regular Contributor"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "5+ merged PRs"
      }), "\n", _jsx(_components.li, {
        children: "Consistent quality contributions"
      }), "\n", _jsx(_components.li, {
        children: "Community participation"
      }), "\n"]
    }), "\n", _jsxs(_components.h4, {
      children: ["🥇 ", _jsx(_components.strong, {
        children: "Core Contributor"
      })]
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: "20+ merged PRs"
      }), "\n", _jsx(_components.li, {
        children: "Significant feature contributions"
      }), "\n", _jsx(_components.li, {
        children: "Mentorship activities"
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "🔧 Advanced Contribution Scenarios"
    }), "\n", _jsx(_components.h3, {
      children: "Large Features"
    }), "\n", _jsx(_components.p, {
      children: "For significant features:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "RFC Process"
        }), ": Create an RFC for design discussion"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Task Breakdown"
        }), ": Use Task Master for planning"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Incremental PRs"
        }), ": Break into smaller, reviewable pieces"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Documentation"
        }), ": Comprehensive docs and examples"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Bug Fixes"
    }), "\n", _jsx(_components.p, {
      children: "For bug fixes:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Issue Link"
        }), ": Reference the GitHub issue"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Reproduction"
        }), ": Include reproduction steps"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Test Coverage"
        }), ": Add tests to prevent regression"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Verification"
        }), ": Test in multiple environments"]
      }), "\n"]
    }), "\n", _jsx(_components.h3, {
      children: "Documentation"
    }), "\n", _jsx(_components.p, {
      children: "For documentation improvements:"
    }), "\n", _jsxs(_components.ol, {
      children: ["\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Accuracy"
        }), ": Ensure technical accuracy"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Completeness"
        }), ": Cover all relevant scenarios"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Examples"
        }), ": Provide working code examples"]
      }), "\n", _jsxs(_components.li, {
        children: [_jsx(_components.strong, {
          children: "Clarity"
        }), ": Write for your target audience"]
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "🚨 Troubleshooting"
    }), "\n", _jsx(_components.h3, {
      children: "Setup Issues"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Node.js Version"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Check version\nnode --version\n\n# Update if needed (recommend Node 18+)\nnvm install 18\nnvm use 18\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "pnpm Installation"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Install pnpm\nnpm install -g pnpm@latest\n\n# Verify installation\npnpm --version\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Validation Failures"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Build Errors"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Clean build\npnpm run clean\npnpm install\npnpm run build\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Test Failures"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Run tests with detailed output\npnpm test --verbose\n\n# Run specific test\npnpm test -- --testNamePattern=\"ComponentName\"\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Linting Issues"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Auto-fix linting issues\npnpm run lint:fix\npnpm run format:fix\n"
      })
    }), "\n", _jsx(_components.h3, {
      children: "Git Issues"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Hook Failures"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Reinstall hooks\nrm -rf .husky/_\nnpx husky install\n"
      })
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Branch Sync"
      })
    }), "\n", _jsx(_components.pre, {
      children: _jsx(_components.code, {
        className: "language-bash",
        children: "# Sync with upstream\ngit fetch upstream\ngit checkout main\ngit merge upstream/main\n"
      })
    }), "\n", _jsx(_components.h2, {
      children: "📚 Additional Resources"
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "../../CONTRIBUTING.md",
          children: "Contributing Guidelines"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "../../CODE_OF_CONDUCT.md",
          children: "Code of Conduct"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "./typescript-types.mdx",
          children: "TypeScript Guide"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "./plugin-development.mdx",
          children: "Plugin Development"
        })
      }), "\n", _jsx(_components.li, {
        children: _jsx(_components.a, {
          href: "../../test/README.md",
          children: "Testing Guidelines"
        })
      }), "\n"]
    }), "\n", _jsx(_components.h2, {
      children: "💬 Getting Help"
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Community Support:"
      })
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Discord: ", _jsx(_components.a, {
          href: "https://discord.gg/conciergus",
          children: "Join our community"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Discussions: ", _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/discussions",
          children: "GitHub Discussions"
        })]
      }), "\n", _jsxs(_components.li, {
        children: ["Issues: ", _jsx(_components.a, {
          href: "https://github.com/conciergus/chat/issues",
          children: "Report bugs or request features"
        })]
      }), "\n"]
    }), "\n", _jsx(_components.p, {
      children: _jsx(_components.strong, {
        children: "Maintainer Support:"
      })
    }), "\n", _jsxs(_components.ul, {
      children: ["\n", _jsxs(_components.li, {
        children: ["Tag ", _jsx(_components.code, {
          children: "@maintainers"
        }), " in PRs for urgent reviews"]
      }), "\n", _jsxs(_components.li, {
        children: ["Use ", _jsx(_components.code, {
          children: "help-wanted"
        }), " label for complex issues"]
      }), "\n", _jsx(_components.li, {
        children: "Schedule office hours for design discussions"
      }), "\n"]
    }), "\n", _jsx(_components.hr, {}), "\n", _jsxs(_components.p, {
      children: [_jsx(_components.strong, {
        children: "Ready to contribute?"
      }), " Run the setup script and start building amazing features! 🚀"]
    })]
  });
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? _jsx(MDXLayout, {
    ...props,
    children: _jsx(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
