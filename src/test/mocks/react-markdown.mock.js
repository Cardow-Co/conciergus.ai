// Mock for react-markdown
const React = require('react');

const ReactMarkdown = ({
  children,
  remarkPlugins,
  rehypePlugins,
  ...props
}) => {
  // Suppress warnings about remarkPlugins and rehypePlugins during testing
  return React.createElement(
    'div',
    {
      'data-testid': 'react-markdown',
      className: 'markdown-content',
      ...props,
    },
    children
  );
};

module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown;
