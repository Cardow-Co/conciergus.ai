/**
 * Secure Chat Implementation Example
 * 
 * This example demonstrates how to implement a secure chat interface
 * using all the security features provided by the Conciergus AI library.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  ConciergusProvider,
  useConciergus,
  ConciergusErrorBoundary,
  SecurityLevel,
  Environment,
  createSecureConfig
} from '@conciergus/chat';

import {
  SecureErrorHandler,
  AIVulnerabilityProtection,
  validateInput,
  sanitizeInput,
  SimpleRateLimiter,
  ContentFilterLevel
} from '@conciergus/chat/security';

/**
 * Secure Configuration Setup
 */
const securityConfig = createSecureConfig({
  level: SecurityLevel.STRICT,
  environment: Environment.PRODUCTION,
  overrides: {
    // Custom rate limiting for chat messages
    rateLimiting: {
      maxRequests: 60,
      windowMs: 60000 // 60 messages per minute
    },
    // Enhanced AI security
    aiSecurity: {
      contentFilterLevel: ContentFilterLevel.STRICT,
      enablePromptSanitization: true,
      enableContentFiltering: true,
      enableInjectionProtection: true,
      maxPromptLength: 2000
    },
    // Strict input validation
    validation: {
      maxInputLength: 2000,
      sanitizeByDefault: true,
      strictMode: true
    }
  }
});

/**
 * Custom Rate Limiter for Additional Protection
 */
const messageRateLimiter = new SimpleRateLimiter(10, 30000); // 10 messages per 30 seconds

/**
 * Secure Chat Input Component
 */
interface SecureChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

function SecureChatInput({ onSendMessage, disabled }: SecureChatInputProps) {
  const [input, setInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Clear errors when input changes
  useEffect(() => {
    if (validationError) setValidationError(null);
    if (rateLimitError) setRateLimitError(null);
  }, [input]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    setIsValidating(true);
    setValidationError(null);
    setRateLimitError(null);

    try {
      // Step 1: Rate limiting check
      const rateLimitResult = await messageRateLimiter.checkLimit('user-session');
      if (!rateLimitResult.allowed) {
        setRateLimitError(`Too many messages. Please wait ${Math.ceil(rateLimitResult.retryAfter / 1000)} seconds.`);
        return;
      }

      // Step 2: Input validation
      const validationResult = await validateInput(input, {
        type: 'USER_INPUT',
        maxLength: 2000,
        allowHtml: false
      });

      if (!validationResult.valid) {
        setValidationError('Invalid input: ' + validationResult.errors.join(', '));
        return;
      }

      // Step 3: Input sanitization
      const sanitizedInput = sanitizeInput(validationResult.data, {
        stripHtml: true,
        escapeSpecialChars: true,
        preventXSS: true
      });

      // Step 4: AI security check
      const aiSecurity = AIVulnerabilityProtection.getInstance();
      const promptAnalysis = await aiSecurity.analyzePrompt(sanitizedInput);
      
      if (promptAnalysis.isHighRisk) {
        setValidationError('Message contains potentially harmful content and cannot be sent.');
        return;
      }

      // Step 5: Send the secure message
      await onSendMessage(promptAnalysis.sanitizedPrompt);
      setInput('');

    } catch (error) {
      // Secure error handling
      const sanitizedError = SecureErrorHandler.sanitizeError(error);
      setValidationError(sanitizedError.message);
    } finally {
      setIsValidating(false);
    }
  }, [input, onSendMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Client-side length check
    if (value.length <= 2000) {
      setInput(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="secure-chat-input">
      <div className="input-container">
        <textarea
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message... (max 2000 characters)"
          disabled={disabled || isValidating}
          maxLength={2000}
          rows={3}
          className={`input-field ${validationError || rateLimitError ? 'error' : ''}`}
        />
        <div className="character-count">
          {input.length}/2000
        </div>
      </div>
      
      {(validationError || rateLimitError) && (
        <div className="error-message">
          {validationError || rateLimitError}
        </div>
      )}
      
      <button
        type="submit"
        disabled={disabled || isValidating || !input.trim()}
        className="send-button"
      >
        {isValidating ? 'Validating...' : 'Send'}
      </button>
    </form>
  );
}

/**
 * Secure Message Display Component
 */
interface SecureMessageDisplayProps {
  message: any; // Replace with proper message type
}

function SecureMessageDisplay({ message }: SecureMessageDisplayProps) {
  const [displayContent, setDisplayContent] = useState(message.content);
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    // Content filtering for AI responses
    if (message.role === 'assistant') {
      const filterContent = async () => {
        try {
          const aiSecurity = AIVulnerabilityProtection.getInstance();
          const filterResult = await aiSecurity.filterContent(
            message.content,
            ContentFilterLevel.STRICT
          );

          if (!filterResult.safe) {
            setDisplayContent('Content filtered for safety.');
            setIsFiltered(true);
          } else {
            setDisplayContent(filterResult.content);
          }
        } catch (error) {
          // Fail safe - don't display potentially harmful content
          setDisplayContent('Content unavailable due to safety filtering.');
          setIsFiltered(true);
        }
      };

      filterContent();
    }
  }, [message]);

  return (
    <div className={`message ${message.role} ${isFiltered ? 'filtered' : ''}`}>
      <div className="message-content">
        {displayContent}
      </div>
      
      {isFiltered && (
        <div className="filter-notice">
          ⚠️ Content was filtered for safety
        </div>
      )}
      
      {message.metadata && (
        <div className="message-metadata">
          <span>Model: {message.metadata.model}</span>
          <span>Tokens: {message.metadata.tokenCount}</span>
          {message.metadata.securityScore && (
            <span>Security Score: {message.metadata.securityScore}/100</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Main Secure Chat Component
 */
function SecureChat() {
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    error,
    metadata 
  } = useConciergus();

  const [lastError, setLastError] = useState<string | null>(null);

  // Handle secure message sending
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMessage(content);
      setLastError(null);
    } catch (error) {
      // Secure error handling
      const sanitizedError = SecureErrorHandler.sanitizeError(error);
      setLastError(sanitizedError.message);
      
      // Log for monitoring (error is already sanitized)
      console.error('Chat error:', sanitizedError);
    }
  }, [sendMessage]);

  return (
    <div className="secure-chat">
      <div className="chat-header">
        <h2>Secure Chat Interface</h2>
        <div className="security-indicators">
          <span className="security-level">Security: STRICT</span>
          <span className="connection-status">🔒 Secure Connection</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <SecureMessageDisplay
            key={message.id}
            message={message}
          />
        ))}
        
        {isLoading && (
          <div className="loading-indicator">
            <span>AI is thinking...</span>
          </div>
        )}
      </div>

      {(error || lastError) && (
        <div className="error-banner">
          {/* Error is automatically sanitized by ConciergusProvider */}
          {error?.message || lastError}
        </div>
      )}

      <SecureChatInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />

      {/* Security Status Display */}
      <div className="security-status">
        <details>
          <summary>Security Status</summary>
          <div className="security-details">
            <p>✅ Input validation enabled</p>
            <p>✅ Rate limiting active</p>
            <p>✅ AI security protection enabled</p>
            <p>✅ Content filtering active</p>
            <p>✅ Error sanitization enabled</p>
            {metadata?.securityMetrics && (
              <div className="security-metrics">
                <p>Threats blocked: {metadata.securityMetrics.threatsBlocked}</p>
                <p>Messages validated: {metadata.securityMetrics.messagesValidated}</p>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

/**
 * Error Fallback Component
 */
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  useEffect(() => {
    // Error is automatically sanitized by ConciergusErrorBoundary
    console.error('Chat application error:', error);
  }, [error]);

  return (
    <div className="error-fallback">
      <h2>Something went wrong</h2>
      <p>The chat interface encountered an error. Please try again.</p>
      <button onClick={resetError} className="retry-button">
        Try Again
      </button>
    </div>
  );
}

/**
 * Main Application with Security
 */
export default function SecureChatApp() {
  return (
    <ConciergusErrorBoundary
      fallback={ErrorFallback}
      onError={(error, errorInfo) => {
        // Safe to log - error is automatically sanitized
        console.error('Application error:', error);
        
        // Safe to send to monitoring service
        if (typeof window !== 'undefined' && (window as any).monitoring) {
          (window as any).monitoring.captureException(error);
        }
      }}
    >
      <ConciergusProvider
        securityConfig={securityConfig}
        onSecurityEvent={(event) => {
          // Handle security events (already sanitized)
          console.log('Security event:', event);
        }}
      >
        <div className="app">
          <header className="app-header">
            <h1>Secure AI Chat Application</h1>
            <p>Protected by Conciergus AI Security</p>
          </header>
          
          <main className="app-main">
            <SecureChat />
          </main>
          
          <footer className="app-footer">
            <p>🔒 This application uses enterprise-grade security features</p>
          </footer>
        </div>
      </ConciergusProvider>
    </ConciergusErrorBoundary>
  );
}

/**
 * CSS Classes (for reference)
 */
const styles = `
.secure-chat {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.security-indicators {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.security-level {
  background: #28a745;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
}

.connection-status {
  color: #28a745;
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
}

.message.user {
  background: #e3f2fd;
  margin-left: 20px;
}

.message.assistant {
  background: #f5f5f5;
  margin-right: 20px;
}

.message.filtered {
  border-left: 3px solid #ff9800;
}

.filter-notice {
  font-size: 12px;
  color: #ff9800;
  margin-top: 5px;
}

.message-metadata {
  font-size: 11px;
  color: #666;
  margin-top: 5px;
  display: flex;
  gap: 10px;
}

.secure-chat-input {
  margin-top: 20px;
}

.input-container {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
}

.input-field.error {
  border-color: #dc3545;
}

.character-count {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 11px;
  color: #666;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin-top: 5px;
}

.send-button {
  margin-top: 10px;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.security-status {
  margin-top: 20px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
}

.security-details p {
  margin: 5px 0;
}

.error-fallback {
  text-align: center;
  padding: 40px;
}

.retry-button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}
`; 