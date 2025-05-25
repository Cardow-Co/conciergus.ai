# Contributing to Conciergus Chat

Thank you for your interest in contributing to Conciergus Chat! This guide will help you get started with the development environment and contribution process.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.x, 20.x, or latest LTS
- **pnpm**: `npm install -g pnpm` (preferred package manager)
- **Git**: Latest version

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/conciergus.ai.git
   cd conciergus.ai
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Verify Setup**
   ```bash
   pnpm run build
   pnpm test
   pnpm run lint
   ```

4. **Start Development**
   ```bash
   pnpm run dev
   ```

### Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm run build` | Build all packages for production |
| `pnpm run dev` | Build in watch mode for development |
| `pnpm test` | Run test suite |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm run lint` | Check code style and errors |
| `pnpm run lint:fix` | Fix auto-fixable linting issues |
| `pnpm run format` | Check code formatting |
| `pnpm run format:fix` | Fix code formatting |
| `pnpm run size` | Check bundle sizes |
| `pnpm run docs:dev` | Start Storybook development server |
| `pnpm run docs:build` | Build documentation |

## 📝 Contribution Workflow

### Before You Start

1. **Check Existing Issues**: Look for existing issues or discussions related to your contribution
2. **Create an Issue**: For significant changes, create an issue to discuss the approach
3. **Follow Coding Standards**: Ensure your code follows our established patterns

### Making Changes

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make Your Changes**
   - Write code following our style guide
   - Add or update tests for your changes
   - Update documentation if needed
   - Ensure all existing tests pass

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting)
   - `refactor:` - Code refactoring
   - `test:` - Test-related changes
   - `chore:` - Build process or auxiliary tool changes

4. **Push and Create PR**
   ```bash
   git push origin your-branch-name
   ```
   
   Then create a pull request on GitHub.

### Versioning with Changesets

For changes that affect the public API:

1. **Create a Changeset**
   ```bash
   pnpm changeset
   ```

2. **Follow the Prompts**
   - Select the packages that changed
   - Choose the appropriate version bump (patch, minor, major)
   - Write a clear description of the changes

3. **Commit the Changeset**
   ```bash
   git add .changeset/
   git commit -m "chore: add changeset for feature"
   ```

## 🧪 Testing Guidelines

### Writing Tests

- Place test files alongside source files with `.test.ts` or `.test.tsx` extension
- Use descriptive test names that explain the expected behavior
- Follow the AAA pattern: Arrange, Act, Assert
- Mock external dependencies and API calls

### Test Structure

```typescript
// Example test structure
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should render correctly with default props', () => {
    // Arrange
    const props = { /* test props */ };
    
    // Act
    render(<ComponentName {...props} />);
    
    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    // Test user interactions
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test ComponentName.test.tsx
```

## 🎨 Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/intersections
- Prefer `const` assertions where appropriate

```typescript
// ✅ Good
interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  author: {
    id: string;
    name: string;
  };
}

const sendMessage = async (message: ChatMessage): Promise<void> => {
  // Implementation
};

// ❌ Avoid
const sendMessage = async (message: any) => {
  // Implementation
};
```

### React Components

- Use functional components with hooks
- Extract custom hooks for reusable logic
- Use TypeScript interfaces for props
- Follow the component structure pattern

```typescript
// ✅ Component structure
interface ChatWidgetProps {
  userId: string;
  apiKey: string;
  onMessage?: (message: ChatMessage) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  userId,
  apiKey,
  onMessage
}) => {
  // Custom hooks
  const { messages, sendMessage } = useChatMessages(userId, apiKey);
  
  // Event handlers
  const handleSendMessage = useCallback((content: string) => {
    sendMessage(content);
    onMessage?.(/* message */);
  }, [sendMessage, onMessage]);

  // Render
  return (
    <div className="chat-widget">
      {/* Component JSX */}
    </div>
  );
};
```

### File Organization

```
src/
├── components/          # React components
│   ├── ChatWidget/     
│   │   ├── index.ts    # Export
│   │   ├── ChatWidget.tsx
│   │   └── ChatWidget.test.tsx
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── examples/           # Usage examples
```

## 🔧 Development Environment

### Recommended IDE Setup

- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - React Snippets

### Environment Variables

Create a `.env.local` file for local development:

```bash
# Required for AI features
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Optional for testing
PERPLEXITY_API_KEY=your_perplexity_key

# Development settings
DEBUG=true
LOG_LEVEL=debug
```

### Debugging

- Use React Developer Tools browser extension
- Enable debug logging with `DEBUG=true`
- Use VS Code debugger configuration (included in `.vscode/`)

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: 
   - OS and version
   - Node.js version
   - React version
   - Package version
6. **Additional Context**: Screenshots, error messages, etc.

### Feature Requests

For feature requests:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your idea for implementing the feature
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Examples, mockups, etc.

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for functions and classes
- Document complex logic and business rules
- Include usage examples in JSDoc

```typescript
/**
 * Sends a message through the AI gateway with retry logic
 * 
 * @param message - The message content to send
 * @param options - Configuration options for the request
 * @returns Promise that resolves to the AI response
 * 
 * @example
 * ```typescript
 * const response = await sendMessage("Hello", {
 *   model: "gpt-4",
 *   temperature: 0.7
 * });
 * ```
 */
```

### API Documentation

- API documentation is auto-generated with TypeDoc
- Ensure all public APIs have proper TypeScript types
- Add examples to complex interfaces

## 🤝 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Getting Help

- **Discord**: Join our community Discord server
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create issues for bugs and feature requests
- **Email**: Contact us at hello@conciergus.ai

## 🎉 Recognition

Contributors will be recognized in:

- The project README
- Release notes for significant contributions
- The project website (coming soon)

Thank you for contributing to Conciergus Chat! 🚀 