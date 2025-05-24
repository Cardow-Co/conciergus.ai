import React from 'react';
import type { PropsWithChildren } from 'react';
import { ConciergusContext } from './ConciergusContext';
import type { ConciergusConfig } from './ConciergusContext';

/**
 * Props for the ConciergusProvider component
 */
export interface ConciergusProviderProps extends ConciergusConfig {
  /** Child components that will consume the context */
  children: React.ReactNode;
}

/**
 * Provider component for Conciergus context
 */
export const ConciergusProvider = ({
  children,
  defaultTTSVoice,
  isTTSEnabledByDefault,
  ttsApiEndpoint,
  onTextToAudio,
  onProcessRecordedAudio,
  proactiveRules,
  enableDebug,
}: PropsWithChildren<ConciergusProviderProps>) => {
  const config: ConciergusConfig = {
    ...(defaultTTSVoice !== undefined && { defaultTTSVoice }),
    ...(isTTSEnabledByDefault !== undefined && { isTTSEnabledByDefault }),
    ...(ttsApiEndpoint !== undefined && { ttsApiEndpoint }),
    ...(onTextToAudio !== undefined && { onTextToAudio }),
    ...(onProcessRecordedAudio !== undefined && { onProcessRecordedAudio }),
    ...(proactiveRules !== undefined && { proactiveRules }),
    ...(enableDebug !== undefined && { enableDebug }),
  };

  if (config.enableDebug) {
    console.debug('[ConciergusProvider] Configuration:', config);
  }

  return (
    <ConciergusContext.Provider value={config}>
      {children}
    </ConciergusContext.Provider>
  );
};

ConciergusProvider.displayName = 'ConciergusProvider';
