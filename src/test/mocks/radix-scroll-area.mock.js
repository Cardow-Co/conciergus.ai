// Mock for @radix-ui/react-scroll-area
const React = require('react');

const ScrollArea = {
  Root: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'scroll-area-root', ...props }, children),
  Viewport: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'scroll-area-viewport', ...props }, children),
  Scrollbar: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'scroll-area-scrollbar', ...props }, children),
  Thumb: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'scroll-area-thumb', ...props }, children),
  Corner: ({ children, ...props }) => React.createElement('div', { 'data-testid': 'scroll-area-corner', ...props }, children),
};

module.exports = ScrollArea;
module.exports.default = ScrollArea;
module.exports.Root = ScrollArea.Root;
module.exports.Viewport = ScrollArea.Viewport;
module.exports.Scrollbar = ScrollArea.Scrollbar;
module.exports.Thumb = ScrollArea.Thumb;
module.exports.Corner = ScrollArea.Corner; 