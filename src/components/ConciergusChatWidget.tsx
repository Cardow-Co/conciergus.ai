import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ConciergusContext } from '../context/ConciergusContext';
import type { ConciergusConfig } from '../context/ConciergusContext';

// ChatStore interface for AI SDK 5 compatibility
export interface ChatStore {
  api?: string;
  maxSteps?: number;
  chats?: Record<string, any>;
  messageMetadataSchema?: any;
  // Additional ChatStore properties from AI SDK 5
  [key: string]: any;
}

export interface ConciergusChatWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  triggerComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  
  // === AI SDK 5 ChatStore Integration ===
  /** ChatStore instance for AI SDK 5 state management */
  chatStore?: ChatStore;
  /** Chat session ID for multiple chat support */
  chatId?: string;
  
  // === Enhanced Configuration ===
  /** Conciergus configuration for AI SDK 5 features */
  config?: ConciergusConfig;
  /** Enable model switching UI */
  enableModelSwitching?: boolean;
  /** Enable telemetry display */
  showTelemetry?: boolean;
  /** Enable metadata display in messages */
  showMessageMetadata?: boolean;
}

export const ConciergusChatWidget: React.FC<ConciergusChatWidgetProps> = ({
  isOpen,
  onOpenChange,
  className,
  children,
  triggerComponent,
  headerComponent,
  footerComponent,
  chatStore,
  chatId,
  config = {},
  enableModelSwitching = false,
  showTelemetry = false,
  showMessageMetadata = false,
  ...rest
}: ConciergusChatWidgetProps) => {
  // Track viewport width for responsive layouts
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Set initial value after mount to avoid SSR mismatch
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced configuration with ChatStore integration
  const enhancedConfig: ConciergusConfig = {
    ...config,
    chatStoreConfig: {
      enablePersistence: true,
      storageKeyPrefix: 'conciergus-chat',
      ...config.chatStoreConfig,
      // Override with chatStore properties if provided
      ...(chatStore && {
        ...(chatStore.maxSteps !== undefined && { maxSteps: chatStore.maxSteps }),
        ...(chatStore.chats !== undefined && { chats: chatStore.chats }),
        ...(chatStore.messageMetadataSchema !== undefined && { 
          messageMetadataSchema: chatStore.messageMetadataSchema 
        }),
      }),
    },
    // UI configuration - props override config values
    showMessageMetadata: showMessageMetadata ?? config.showMessageMetadata,
    showReasoningTraces: config.showReasoningTraces,
    showSourceCitations: config.showSourceCitations,
    enableDebug: showTelemetry || config.enableDebug,
  };

  // Styles for overlay and content based on device
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 50,
  };
  
  const mobileContentStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    width: '100vw',
    maxWidth: '100%',
    height: '80vh',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden',
    zIndex: 51,
  };
  
  const desktopContentStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '50vw',
    maxWidth: '600px',
    height: '60vh',
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '8px',
    overflow: 'hidden',
    zIndex: 51,
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {triggerComponent && (
        <Dialog.Trigger asChild>
          <div data-chat-widget-trigger>{triggerComponent}</div>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <div data-chat-widget-root className={className} {...rest}>
          <Dialog.Overlay data-chat-widget-overlay style={overlayStyle} />
          <Dialog.Content
            data-chat-widget-content
            style={isMobile ? mobileContentStyle : desktopContentStyle}
          >
            <ConciergusContext.Provider value={enhancedConfig}>
              {/* Enhanced header with model switching */}
              {headerComponent && (
                <div data-chat-widget-header className="chat-widget-header">
                  {headerComponent}
                  {enableModelSwitching && (
                    <div className="model-switcher" data-model-switcher>
                      {/* Model switching UI will be implemented in future subtasks */}
                    </div>
                  )}
                </div>
              )}
              
              {/* Main chat content with ChatStore context */}
              <div 
                data-chat-widget-body 
                className="chat-widget-body"
                data-chat-id={chatId}
                data-chat-store={chatStore ? 'enabled' : 'disabled'}
              >
                {children}
              </div>
              
              {/* Enhanced footer with telemetry */}
              {footerComponent && (
                <div data-chat-widget-footer className="chat-widget-footer">
                  {footerComponent}
                  {showTelemetry && (
                    <div className="telemetry-display" data-telemetry-display>
                      {/* Telemetry UI will be implemented in future subtasks */}
                    </div>
                  )}
                </div>
              )}
            </ConciergusContext.Provider>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConciergusChatWidget;
