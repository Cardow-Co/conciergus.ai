# Security Examples

This directory contains practical examples demonstrating how to implement various security features in the Conciergus AI library.

## Available Examples

### Basic Implementation
- **[secure-chat-implementation.tsx](./secure-chat-implementation.tsx)** - Complete secure chat interface with React
- **[express-server-setup.js](./express-server-setup.js)** - Express.js server with security middleware
- **[next-js-integration.tsx](./next-js-integration.tsx)** - Next.js application with security features

### Advanced Patterns
- **[multi-layer-security.ts](./multi-layer-security.ts)** - Implementing defense in depth
- **[custom-validators.ts](./custom-validators.ts)** - Creating custom validation rules
- **[security-monitoring.ts](./security-monitoring.ts)** - Security event monitoring and alerting

### Framework Integrations
- **[react-hooks.tsx](./react-hooks.tsx)** - Custom React hooks for security
- **[vue-composables.ts](./vue-composables.ts)** - Vue.js composables for security
- **[angular-services.ts](./angular-services.ts)** - Angular services for security

### Testing Examples
- **[security-testing.test.ts](./security-testing.test.ts)** - Comprehensive security test suite
- **[penetration-testing.ts](./penetration-testing.ts)** - Automated penetration testing

## Usage

Each example includes:
- Complete, runnable code
- Detailed comments explaining security considerations
- Configuration options and customization points
- Testing instructions
- Performance considerations

## Getting Started

1. Choose an example that matches your use case
2. Copy the relevant code to your project
3. Customize configuration for your environment
4. Run the included tests to verify functionality
5. Deploy with security best practices

## Example Categories

### Input Validation Examples
```typescript
// Basic validation
const result = await validateInput(userInput, {
  type: 'USER_INPUT',
  maxLength: 1000,
  strictMode: true
});

// Custom validation rules
const validator = new CustomValidator([
  new EmailValidator(),
  new PhoneNumberValidator(),
  new ContentPolicyValidator()
]);
```

### Rate Limiting Examples
```typescript
// Simple rate limiting
const limiter = new SimpleRateLimiter(100, 60000);

// Advanced multi-tier limiting
const advancedLimiter = new AdvancedRateLimiter();
advancedLimiter.addRule('authenticated', { maxRequests: 200, windowMs: 60000 });
advancedLimiter.addRule('anonymous', { maxRequests: 20, windowMs: 60000 });
```

### AI Security Examples
```typescript
// Prompt injection protection
const analysis = await aiSecurity.analyzePrompt(userPrompt);
if (analysis.isHighRisk) {
  throw new SecurityError('Potentially harmful prompt detected');
}

// Content filtering
const filtered = await aiSecurity.filterContent(response, ContentFilterLevel.STRICT);
```

## Contributing Examples

To contribute a new example:

1. Create a new file with a descriptive name
2. Include comprehensive comments
3. Add error handling and security considerations
4. Include test cases
5. Update this README with a description
6. Submit a pull request

## Support

If you have questions about any example:
- Check the main [Security Documentation](../README.md)
- Review the [API Reference](../api-reference.md)
- Open an issue on GitHub
- Contact support@conciergus.ai 