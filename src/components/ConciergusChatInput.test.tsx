import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { ConciergusChatInput, type ConciergusChatInputProps } from './ConciergusChatInput';
import { ConciergusProvider } from '../context/ConciergusProvider';

// Mock react-textarea-autosize
jest.mock('react-textarea-autosize', () => ({
  __esModule: true,
  default: React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
    <textarea ref={ref} {...props} />
  ))
}));

// Mock the useConciergusChat hook
jest.mock('../context/ConciergusAISDK5Hooks', () => ({
  useConciergusChat: jest.fn()
}));

// Mock the useConciergus hook
jest.mock('../context/useConciergus', () => ({
  useConciergus: jest.fn()
}));

// Mock File API for file upload tests
const mockFile = (name: string, size: number, type: string = 'text/plain') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Default props for testing
const defaultProps: ConciergusChatInputProps = {
  onSend: jest.fn(),
  placeholder: 'Type a message...'
};

// Wrapper component with provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ConciergusProvider>
    {children}
  </ConciergusProvider>
);

// Get the mocked functions
const { useConciergusChat } = require('../context/ConciergusAISDK5Hooks');
const { useConciergus } = require('../context/useConciergus');

describe('ConciergusChatInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default useConciergus mock
    (useConciergus as jest.Mock).mockReturnValue({
      config: {
        defaultModel: 'gpt-4',
        apiKey: 'test-key'
      },
      isEnhanced: true,
      hasFeature: jest.fn().mockReturnValue(true)
    });
    
    // Default useConciergusChat mock
    (useConciergusChat as jest.Mock).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      append: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      setMessages: jest.fn(),
      store: {
        messages: [],
        addMessage: jest.fn(),
        subscribe: jest.fn(() => () => {})
      }
    });
  });

  describe('Basic Rendering', () => {
    test('renders with default props', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    test('renders with custom placeholder', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            placeholder="Ask me anything..."
          />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    });

    test('renders in compact mode', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            compact={true}
          />
        </TestWrapper>
      );

      const container = screen.getByRole('textbox').closest('.conciergus-chat-input');
      expect(container).toHaveClass('compact');
    });

    test('renders as disabled', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            disabled={true}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
    });
  });

  describe('Input Handling', () => {
    test('handles text input changes', async () => {
      const user = userEvent.setup();
      const onInputChange = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onInputChange={onInputChange}
            debounceDelay={0} // No debounce for testing
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');

      expect(textarea).toHaveValue('Hello world');
      
      // Wait for debounced callback
      await waitFor(() => {
        expect(onInputChange).toHaveBeenCalledWith('Hello world');
      });
    });

    test('respects maximum character limit', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ maxLength: 10 }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'This text is way too long');

      expect(textarea).toHaveValue('This text '); // Only first 10 characters
    });

    test('shows character count when enabled', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ 
              maxLength: 100,
              showCharacterCount: true 
            }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');

      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    test('validates input with custom validator', async () => {
      const user = userEvent.setup();
      const validator = jest.fn((text: string) => 
        text.includes('bad') ? 'Contains inappropriate content' : null
      );

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ validator }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'This is bad content');

      await waitFor(() => {
        expect(screen.getByText('Contains inappropriate content')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
      });
    });

    test('transforms input with custom transformer', async () => {
      const user = userEvent.setup();
      const transformer = jest.fn((text: string) => text.toUpperCase());

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ transformer }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'hello');

      expect(textarea).toHaveValue('HELLO');
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('sends message on Enter key', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');
      await user.keyboard('{Enter}');

      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello world',
          role: 'user'
        }),
        expect.any(Object)
      );
    });

    test('creates new line on Shift+Enter', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            allowMultiline={true}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(onSend).not.toHaveBeenCalled();
    });

    test('disables Enter to send when submitOnEnter is false', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            submitOnEnter={false}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello world');
      await user.keyboard('{Enter}');

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    test('sends message with correct format', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^msg-\d+-[a-z0-9]+$/),
          role: 'user',
          content: 'Test message',
          createdAt: expect.any(Date)
        }),
        expect.objectContaining({
          metadata: expect.objectContaining({
            inputMethod: 'text',
            hasFiles: false,
            fileCount: 0
          })
        })
      );
    });

    test('clears input after sending when clearAfterSend is true', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            sendingOptions={{ clearAfterSend: true }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('does not clear input when clearAfterSend is false', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            sendingOptions={{ clearAfterSend: false }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onSend).toHaveBeenCalled();
      });

      expect(textarea).toHaveValue('Test message');
    });

    test('shows loading state while sending', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value?: any) => void;
      const sendPromise = new Promise(resolve => { resolvePromise = resolve; });
      const onSend = jest.fn().mockReturnValue(sendPromise);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /sending message/i })).toBeInTheDocument();
      expect(screen.getByText('Sending message...')).toBeInTheDocument();
      expect(textarea).toBeDisabled();

      // Resolve the promise
      act(() => {
        resolvePromise();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
        expect(textarea).not.toBeDisabled();
      });
    });

    test('handles send error gracefully', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn().mockRejectedValue(new Error('Send failed'));
      const onError = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            onError={onError}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    test('preprocesses message before sending', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();
      const preprocessMessage = jest.fn((content: string) => `Processed: ${content}`);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            sendingOptions={{ preprocessMessage }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Hello');
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Processed: Hello'
        }),
        expect.any(Object)
      );
    });
  });

  describe('File Attachments', () => {
    test('does not show file attachment button when disabled', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ enabled: false }}
          />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Attach files')).not.toBeInTheDocument();
    });

    test('shows file attachment button when enabled', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ enabled: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Attach files')).toBeInTheDocument();
    });

    test('handles file selection', async () => {
      const user = userEvent.setup();
      const onFileAttach = jest.fn();
      const file = mockFile('test.txt', 1000);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ enabled: true }}
            onFileAttach={onFileAttach}
          />
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);

      expect(onFileAttach).toHaveBeenCalledWith([file]);
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    test('validates file size', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const largeFile = mockFile('large.txt', 20 * 1024 * 1024); // 20MB

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ 
              enabled: true,
              maxFileSize: 10 * 1024 * 1024 // 10MB limit
            }}
            onError={onError}
          />
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, largeFile);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('too large')
        })
      );
    });

    test('validates file type', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const invalidFile = mockFile('test.exe', 1000, 'application/x-executable');

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ 
              enabled: true,
              acceptedTypes: ['image/*', '.pdf', '.txt']
            }}
            onError={onError}
          />
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, invalidFile);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('not an accepted file type')
        })
      );
    });

    test('limits number of files', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const file1 = mockFile('test1.txt', 1000);
      const file2 = mockFile('test2.txt', 1000);
      const file3 = mockFile('test3.txt', 1000);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ 
              enabled: true,
              maxFiles: 2
            }}
            onError={onError}
          />
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Add first two files
      await user.upload(fileInput, [file1, file2]);
      
      // Try to add third file
      await user.upload(fileInput, file3);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Maximum 2 files allowed')
        })
      );
    });

    test('removes attached files', async () => {
      const user = userEvent.setup();
      const file = mockFile('test.txt', 1000);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            fileOptions={{ enabled: true }}
          />
        </TestWrapper>
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      expect(screen.getByText('test.txt')).toBeInTheDocument();

      const removeButton = screen.getByLabelText('Remove test.txt');
      await user.click(removeButton);

      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });

    test('includes files in message metadata when sending', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn();
      const file = mockFile('test.txt', 1000);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            fileOptions={{ enabled: true }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      await user.type(textarea, 'Message with file');
      await user.click(sendButton);

      expect(onSend).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          files: [file],
          metadata: expect.objectContaining({
            hasFiles: true,
            fileCount: 1
          })
        })
      );
    });
  });

  describe('Voice Input', () => {
    test('does not show voice button when disabled', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            voiceOptions={{ enabled: false }}
          />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Start voice input')).not.toBeInTheDocument();
    });

    test('shows voice button when enabled', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            voiceOptions={{ enabled: true }}
          />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Start voice input')).toBeInTheDocument();
    });

    test('toggles recording state', async () => {
      const user = userEvent.setup();
      const onVoiceStart = jest.fn();
      const onVoiceEnd = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            voiceOptions={{ enabled: true }}
            onVoiceStart={onVoiceStart}
            onVoiceEnd={onVoiceEnd}
          />
        </TestWrapper>
      );

      const voiceButton = screen.getByLabelText('Start voice input');
      
      // Start recording
      await user.click(voiceButton);
      expect(onVoiceStart).toHaveBeenCalled();
      expect(screen.getByLabelText('Stop recording')).toBeInTheDocument();

      // Stop recording
      await user.click(screen.getByLabelText('Stop recording'));
      expect(onVoiceEnd).toHaveBeenCalledWith('');
    });
  });

  describe('Auto-save Functionality', () => {
    test('saves input to localStorage when enabled', async () => {
      const user = userEvent.setup();
      const localStorageSetSpy = jest.spyOn(Storage.prototype, 'setItem');

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ 
              autoSave: true,
              autoSaveKey: 'test-key'
            }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test content');

      expect(localStorageSetSpy).toHaveBeenCalledWith('test-key', 'Test content');

      localStorageSetSpy.mockRestore();
    });

    test('loads saved content on mount', () => {
      const localStorageGetSpy = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue('Saved content');

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ 
              autoSave: true,
              autoSaveKey: 'test-key'
            }}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('textbox')).toHaveValue('Saved content');
      expect(localStorageGetSpy).toHaveBeenCalledWith('test-key');

      localStorageGetSpy.mockRestore();
    });

    test('clears auto-saved content after sending', async () => {
      const user = userEvent.setup();
      const localStorageRemoveSpy = jest.spyOn(Storage.prototype, 'removeItem');
      const onSend = jest.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            inputOptions={{ 
              autoSave: true,
              autoSaveKey: 'test-key'
            }}
            sendingOptions={{ clearAfterSend: true }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(localStorageRemoveSpy).toHaveBeenCalledWith('test-key');
      });

      localStorageRemoveSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('sets proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            ariaLabel="Custom chat input"
            ariaDescription="Enter your message here"
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Custom chat input');
      expect(textarea).toHaveAttribute('aria-describedby', 'chat-input-description');
      expect(screen.getByText('Enter your message here')).toBeInTheDocument();
    });

    test('sets aria-invalid when validation error occurs', async () => {
      const user = userEvent.setup();
      const validator = jest.fn(() => 'Validation error');

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ validator }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'test');

      await waitFor(() => {
        expect(textarea).toHaveAttribute('aria-invalid', 'true');
      });
    });

    test('associates error messages with aria-describedby', async () => {
      const user = userEvent.setup();
      const validator = jest.fn(() => 'Validation error');

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            inputOptions={{ validator }}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'test');

      await waitFor(() => {
        const errorElement = screen.getByText('Validation error');
        expect(errorElement).toHaveAttribute('role', 'alert');
      });
    });

    test('supports auto-focus', () => {
      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            autoFocus={true}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Custom Components', () => {
    test('renders custom send button component', () => {
      const CustomSendButton = ({ inputValue }: any) => (
        <button>Custom Send: {inputValue}</button>
      );

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            sendButtonComponent={CustomSendButton}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Send:')).toBeInTheDocument();
    });

    test('renders custom loading component', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value?: any) => void;
      const sendPromise = new Promise(resolve => { resolvePromise = resolve; });
      const onSend = jest.fn().mockReturnValue(sendPromise);

      const CustomLoading = ({ message }: any) => (
        <div>Custom Loading: {message}</div>
      );

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            loadingComponent={CustomLoading}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(screen.getByText('Custom Loading: Sending message...')).toBeInTheDocument();

      // Cleanup
      act(() => {
        resolvePromise();
      });
    });
  });

  describe('Debug Mode', () => {
    test('logs send events when debug is enabled', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const onSend = jest.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            debug={true}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Sending message:',
        expect.objectContaining({
          content: 'Test message',
          files: []
        })
      );

      consoleSpy.mockRestore();
    });

    test('logs errors when debug is enabled', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onSend = jest.fn().mockRejectedValue(new Error('Send failed'));

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
            debug={true}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Send error:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Focus Management', () => {
    test('maintains focus after successful send', async () => {
      const user = userEvent.setup();
      const onSend = jest.fn().mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onSend={onSend}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(textarea, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    });

    test('calls focus and blur handlers', async () => {
      const user = userEvent.setup();
      const onFocus = jest.fn();
      const onBlur = jest.fn();

      render(
        <TestWrapper>
          <ConciergusChatInput 
            {...defaultProps}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </TestWrapper>
      );

      const textarea = screen.getByRole('textbox');

      await user.click(textarea);
      expect(onFocus).toHaveBeenCalled();

      await user.tab();
      expect(onBlur).toHaveBeenCalled();
    });
  });
}); 