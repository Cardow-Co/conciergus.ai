import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConciergusChatWidget } from './ConciergusChatWidget';

describe('ConciergusChatWidget', () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: jest.fn(),
  };

  it('renders overlay and content when open', () => {
    render(<ConciergusChatWidget {...defaultProps} />);
    const overlay = document.querySelector('[data-chat-widget-overlay]');
    const content = document.querySelector('[data-chat-widget-content]');
    expect(overlay).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('applies className and extra props to root element', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        className="test-class"
        data-test-id="chat-widget"
      />
    );
    const root = document.querySelector(
      '[data-chat-widget-root].test-class[data-test-id="chat-widget"]'
    );
    expect(root).toBeInTheDocument();
  });

  it('renders triggerComponent', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        triggerComponent={<button>Open Chat</button>}
      />
    );
    expect(screen.getByText('Open Chat')).toBeInTheDocument();
  });

  it('renders header, body, and footer slots', () => {
    render(
      <ConciergusChatWidget
        {...defaultProps}
        headerComponent={<div>Header Content</div>}
        footerComponent={<div>Footer Content</div>}
      >
        <div>Body Content</div>
      </ConciergusChatWidget>
    );
    const header = document.querySelector('[data-chat-widget-header]');
    const body = document.querySelector('[data-chat-widget-body]');
    const footer = document.querySelector('[data-chat-widget-footer]');
    expect(header).toHaveTextContent('Header Content');
    expect(body).toHaveTextContent('Body Content');
    expect(footer).toHaveTextContent('Footer Content');
  });
});
