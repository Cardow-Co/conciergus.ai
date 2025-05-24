// Generic mock for @radix-ui/* components
const React = require('react');

// Generic component factory
const createMockComponent = (name) => ({ children, ...props }) => 
  React.createElement('div', { 'data-testid': `radix-${name}`, ...props }, children);

// Common Radix UI component patterns
const mockComponents = {
  Root: createMockComponent('root'),
  Trigger: createMockComponent('trigger'),
  Content: createMockComponent('content'),
  Portal: createMockComponent('portal'),
  Overlay: createMockComponent('overlay'),
  Title: createMockComponent('title'),
  Description: createMockComponent('description'),
  Close: createMockComponent('close'),
  Viewport: createMockComponent('viewport'),
  Scrollbar: createMockComponent('scrollbar'),
  Thumb: createMockComponent('thumb'),
  Corner: createMockComponent('corner'),
  Item: createMockComponent('item'),
  Group: createMockComponent('group'),
  Label: createMockComponent('label'),
  Separator: createMockComponent('separator'),
  Arrow: createMockComponent('arrow'),
  Anchor: createMockComponent('anchor'),
};

// Export all common patterns
module.exports = mockComponents;
Object.keys(mockComponents).forEach(key => {
  module.exports[key] = mockComponents[key];
}); 