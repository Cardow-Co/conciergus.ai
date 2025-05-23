import { useContext } from 'react';
import { ConciergusContext, ConciergusConfig } from './ConciergusContext';

/**
 * Hook to access the Conciergus configuration context
 * @throws Error if used outside of a ConciergusProvider
 */
export function useConciergus(): ConciergusConfig {
  const context = useContext(ConciergusContext);
  if (!context) {
    throw new Error('useConciergus must be used within a ConciergusProvider');
  }
  return context;
}
