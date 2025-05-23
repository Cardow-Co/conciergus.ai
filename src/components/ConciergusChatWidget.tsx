import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export interface ConciergusChatWidgetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  children?: React.ReactNode;
  triggerComponent?: React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
}

export const ConciergusChatWidget: React.FC<ConciergusChatWidgetProps> = ({
  isOpen,
  onOpenChange,
  className,
  children,
  triggerComponent,
  headerComponent,
  footerComponent,
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

  // Styles for overlay and content based on device
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            {headerComponent && (
              <div data-chat-widget-header>{headerComponent}</div>
            )}
            <div data-chat-widget-body>{children}</div>
            {footerComponent && (
              <div data-chat-widget-footer>{footerComponent}</div>
            )}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ConciergusChatWidget;
