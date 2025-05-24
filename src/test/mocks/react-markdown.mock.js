// Mock for react-markdown
const React = require('react');

const ReactMarkdown = ({ children, ...props }) => {
  return React.createElement('div', { 
    'data-testid': 'react-markdown',
    className: 'markdown-content',
    ...props 
  }, children);
};

module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown; 