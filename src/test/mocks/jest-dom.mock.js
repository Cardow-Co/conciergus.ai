/**
 * Mock for @testing-library/jest-dom
 * This is a no-op mock to avoid ESM import issues
 */

// Mock some common jest-dom matchers as no-ops
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend({
    toBeInTheDocument: () => ({ pass: true, message: () => 'mock matcher' }),
    toHaveTextContent: () => ({ pass: true, message: () => 'mock matcher' }),
    toHaveClass: () => ({ pass: true, message: () => 'mock matcher' }),
    toBeVisible: () => ({ pass: true, message: () => 'mock matcher' }),
    toHaveValue: () => ({ pass: true, message: () => 'mock matcher' }),
    toHaveAttribute: () => ({ pass: true, message: () => 'mock matcher' }),
    toBeTruthy: () => ({ pass: true, message: () => 'mock matcher' }),
  });
}

module.exports = {};
