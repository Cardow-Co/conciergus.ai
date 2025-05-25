import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DebugManager,
  DebugLog,
  SystemHealth,
  SystemDiagnostics,
  DebugConfig,
} from './DebugManager';

// Hook for debug logging
export function useDebugLogger(debugManager: DebugManager) {
  const logDebug = useCallback(
    (message: string, data?: any, source?: string, category?: string) => {
      debugManager.debug(message, data, source, category);
    },
    [debugManager]
  );

  const logInfo = useCallback(
    (message: string, data?: any, source?: string, category?: string) => {
      debugManager.info(message, data, source, category);
    },
    [debugManager]
  );

  const logWarn = useCallback(
    (message: string, data?: any, source?: string, category?: string) => {
      debugManager.warn(message, data, source, category);
    },
    [debugManager]
  );

  const logError = useCallback(
    (message: string, data?: any, source?: string, category?: string) => {
      debugManager.error(message, data, source, category);
    },
    [debugManager]
  );

  return {
    debug: logDebug,
    info: logInfo,
    warn: logWarn,
    error: logError,
  };
}

// Hook for viewing and filtering logs
export function useDebugLogs(debugManager: DebugManager) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filters, setFilters] = useState<{
    level?: DebugLog['level'];
    category?: string;
    source?: string;
    since?: Date;
    limit?: number;
  }>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const refreshLogs = useCallback(() => {
    const filteredLogs = debugManager.getLogs(filters);
    setLogs(filteredLogs);
  }, [debugManager, filters]);

  const updateFilters = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, []);

  const clearLogs = useCallback(() => {
    debugManager.clearLogs();
    refreshLogs();
  }, [debugManager, refreshLogs]);

  const exportLogs = useCallback(
    (format: 'json' | 'csv' = 'json') => {
      return debugManager.exportLogs(format);
    },
    [debugManager]
  );

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refreshLogs, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshLogs]);

  // Initial load and filter changes
  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  return {
    logs,
    filters,
    updateFilters,
    refreshLogs,
    clearLogs,
    exportLogs,
    autoRefresh,
    setAutoRefresh,
  };
}

// Hook for system health monitoring
export function useSystemHealth(debugManager: DebugManager) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const healthStatus = debugManager.checkSystemHealth();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Failed to check system health:', error);
    } finally {
      setIsChecking(false);
    }
  }, [debugManager]);

  // Auto-check functionality
  useEffect(() => {
    if (autoCheck) {
      checkHealth(); // Initial check
      intervalRef.current = setInterval(checkHealth, 30000); // Check every 30 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoCheck, checkHealth]);

  return {
    health,
    isChecking,
    checkHealth,
    autoCheck,
    setAutoCheck,
  };
}

// Hook for system diagnostics
export function useSystemDiagnostics(debugManager: DebugManager) {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout>();

  const refreshDiagnostics = useCallback(() => {
    setIsLoading(true);
    try {
      const diag = debugManager.getDiagnostics();
      setDiagnostics(diag);
    } catch (error) {
      console.error('Failed to get diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debugManager]);

  const exportDiagnostics = useCallback(() => {
    return debugManager.exportDiagnostics();
  }, [debugManager]);

  const resetSystem = useCallback(() => {
    debugManager.reset();
    refreshDiagnostics();
  }, [debugManager, refreshDiagnostics]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      refreshDiagnostics(); // Initial load
      intervalRef.current = setInterval(refreshDiagnostics, 5000); // Refresh every 5 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshDiagnostics]);

  return {
    diagnostics,
    isLoading,
    refreshDiagnostics,
    exportDiagnostics,
    resetSystem,
    autoRefresh,
    setAutoRefresh,
  };
}

// Hook for debug configuration
export function useDebugConfig(debugManager: DebugManager) {
  const [config, setConfig] = useState<DebugConfig>(debugManager.getConfig());
  const [isUpdating, setIsUpdating] = useState(false);

  const updateConfig = useCallback(
    async (newConfig: Partial<DebugConfig>) => {
      setIsUpdating(true);
      try {
        debugManager.updateConfig(newConfig);
        setConfig(debugManager.getConfig());
      } catch (error) {
        console.error('Failed to update debug config:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [debugManager]
  );

  const resetConfig = useCallback(() => {
    const defaultConfig: DebugConfig = {
      logLevel: 'info',
      maxLogs: 1000,
      enableConsoleOutput: true,
      enablePersistence: false,
      categories: ['gateway', 'fallback', 'cost', 'performance', 'admin'],
    };
    updateConfig(defaultConfig);
  }, [updateConfig]);

  return {
    config,
    updateConfig,
    resetConfig,
    isUpdating,
  };
}

// Hook for request tracking
export function useRequestTracker(debugManager: DebugManager) {
  const trackRequest = useCallback(
    (responseTime?: number) => {
      debugManager.trackRequest(responseTime);
    },
    [debugManager]
  );

  const trackApiCall = useCallback(
    async <T>(
      apiCall: () => Promise<T>,
      source = 'api',
      category = 'request'
    ): Promise<T> => {
      const startTime = Date.now();

      try {
        debugManager.info(`API call started`, { source }, source, category);
        const result = await apiCall();
        const responseTime = Date.now() - startTime;

        debugManager.trackRequest(responseTime);
        debugManager.info(
          `API call completed`,
          { responseTime, source },
          source,
          category
        );

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        debugManager.trackRequest(responseTime);
        debugManager.error(
          `API call failed`,
          { error, responseTime, source },
          source,
          category
        );
        throw error;
      }
    },
    [debugManager]
  );

  return {
    trackRequest,
    trackApiCall,
  };
}

// Comprehensive debug dashboard hook
export function useDebugDashboard(debugManager: DebugManager) {
  const logs = useDebugLogs(debugManager);
  const health = useSystemHealth(debugManager);
  const diagnostics = useSystemDiagnostics(debugManager);
  const config = useDebugConfig(debugManager);
  const logger = useDebugLogger(debugManager);
  const tracker = useRequestTracker(debugManager);

  const [activeTab, setActiveTab] = useState<
    'logs' | 'health' | 'diagnostics' | 'config'
  >('logs');

  const exportAll = useCallback(() => {
    const allData = {
      logs: logs.logs,
      health: health.health,
      diagnostics: diagnostics.diagnostics,
      config: config.config,
      exportTime: new Date().toISOString(),
    };
    return JSON.stringify(allData, null, 2);
  }, [logs.logs, health.health, diagnostics.diagnostics, config.config]);

  return {
    // Individual hooks
    logs,
    health,
    diagnostics,
    config,
    logger,
    tracker,

    // Dashboard state
    activeTab,
    setActiveTab,
    exportAll,
  };
}
