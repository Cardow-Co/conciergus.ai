// Mock for @radix-ui/react-dialog to resolve ES module issues in Jest
const React = require('react');

const DialogRoot = ({ children, open, onOpenChange, ...props }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'dialog-root', ...props },
    children
  );
};

const DialogTrigger = ({ children, asChild, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      'data-testid': 'dialog-trigger',
      ...props,
    });
  }
  return React.createElement(
    'button',
    { 'data-testid': 'dialog-trigger', ...props },
    children
  );
};

const DialogPortal = ({ children, ...props }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'dialog-portal', ...props },
    children
  );
};

const DialogOverlay = ({ children, ...props }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'dialog-overlay', ...props },
    children
  );
};

const DialogContent = ({ children, ...props }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'dialog-content', ...props },
    children
  );
};

const DialogTitle = ({ children, ...props }) => {
  return React.createElement(
    'h1',
    { 'data-testid': 'dialog-title', ...props },
    children
  );
};

const DialogDescription = ({ children, ...props }) => {
  return React.createElement(
    'p',
    { 'data-testid': 'dialog-description', ...props },
    children
  );
};

const DialogClose = ({ children, asChild, ...props }) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      'data-testid': 'dialog-close',
      ...props,
    });
  }
  return React.createElement(
    'button',
    { 'data-testid': 'dialog-close', ...props },
    children
  );
};

module.exports = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
};
