// src/hooks/useRefreshManager.ts - Centralized Refresh Management
import { useCallback, useRef, useEffect } from 'react';

interface RefreshConfig {
  interval: number;
  enabled: boolean;
  minInterval?: number;
  maxRetries?: number;
}

interface RefreshManager {
  register: (key: string, callback: () => Promise<void>, config: RefreshConfig) => void;
  unregister: (key: string) => void;
  refresh: (key: string, force?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  updateConfig: (key: string, config: Partial<RefreshConfig>) => void;
}

interface RegisteredRefresh {
  callback: () => Promise<void>;
  config: RefreshConfig;
  lastRefresh: number;
  isRunning: boolean;
  retryCount: number;
  interval?: NodeJS.Timeout;
}

class RefreshManagerSingleton {
  private refreshes: Map<string, RegisteredRefresh> = new Map();
  private globalInterval: NodeJS.Timeout | null = null;
  private readonly GLOBAL_INTERVAL = 5000; // 5 seconds
  
  constructor() {
    this.startGlobalInterval();
  }

  private startGlobalInterval() {
    if (this.globalInterval) {
      clearInterval(this.globalInterval);
    }
    
    this.globalInterval = setInterval(() => {
      this.processRefreshes();
    }, this.GLOBAL_INTERVAL);
  }

  private async processRefreshes() {
    const now = Date.now();
    
    for (const [key, refresh] of this.refreshes.entries()) {
      if (!refresh.config.enabled || refresh.isRunning) {
        continue;
      }

      const timeSinceLastRefresh = now - refresh.lastRefresh;
      
      if (timeSinceLastRefresh >= refresh.config.interval) {
        this.executeRefresh(key, refresh);
      }
    }
  }

  private async executeRefresh(key: string, refresh: RegisteredRefresh) {
    refresh.isRunning = true;
    
    try {
      await refresh.callback();
      refresh.lastRefresh = Date.now();
      refresh.retryCount = 0;
    } catch (error) {
      console.error(`Refresh failed for ${key}:`, error);
      refresh.retryCount++;
      
      const maxRetries = refresh.config.maxRetries || 3;
      if (refresh.retryCount >= maxRetries) {
        console.warn(`Max retries reached for ${key}, disabling refresh`);
        refresh.config.enabled = false;
      }
    } finally {
      refresh.isRunning = false;
    }
  }

  register(key: string, callback: () => Promise<void>, config: RefreshConfig) {
    // Unregister if already exists
    this.unregister(key);
    
    const refresh: RegisteredRefresh = {
      callback,
      config: { ...config },
      lastRefresh: 0,
      isRunning: false,
      retryCount: 0
    };
    
    this.refreshes.set(key, refresh);
    console.log(`✅ Registered refresh: ${key} with interval ${config.interval}ms`);
  }

  unregister(key: string) {
    const refresh = this.refreshes.get(key);
    if (refresh?.interval) {
      clearInterval(refresh.interval);
    }
    this.refreshes.delete(key);
    console.log(`❌ Unregistered refresh: ${key}`);
  }

  async refresh(key: string, force: boolean = false): Promise<void> {
    const refresh = this.refreshes.get(key);
    if (!refresh) {
      console.warn(`⚠️ Refresh not found: ${key}`);
      return;
    }

    if (force || !refresh.isRunning) {
      const now = Date.now();
      const minInterval = refresh.config.minInterval || 2000; // 2 second minimum
      
      if (force || now - refresh.lastRefresh >= minInterval) {
        await this.executeRefresh(key, refresh);
      }
    }
  }

  async refreshAll(): Promise<void> {
    const promises = Array.from(this.refreshes.keys()).map(key => 
      this.refresh(key, true)
    );
    await Promise.allSettled(promises);
  }

  updateConfig(key: string, configUpdate: Partial<RefreshConfig>) {
    const refresh = this.refreshes.get(key);
    if (refresh) {
      refresh.config = { ...refresh.config, ...configUpdate };
      console.log(`🔧 Updated config for ${key}:`, configUpdate);
    }
  }

  destroy() {
    // Clear all intervals
    for (const refresh of this.refreshes.values()) {
      if (refresh.interval) {
        clearInterval(refresh.interval);
      }
    }
    
    if (this.globalInterval) {
      clearInterval(this.globalInterval);
      this.globalInterval = null;
    }
    
    this.refreshes.clear();
    console.log('🗑️ RefreshManager destroyed');
  }

  getStatus() {
    const status = new Map();
    for (const [key, refresh] of this.refreshes.entries()) {
      status.set(key, {
        enabled: refresh.config.enabled,
        interval: refresh.config.interval,
        lastRefresh: new Date(refresh.lastRefresh).toISOString(),
        isRunning: refresh.isRunning,
        retryCount: refresh.retryCount
      });
    }
    return status;
  }
}

// Singleton instance
const refreshManagerInstance = new RefreshManagerSingleton();

// Hook for components to use the refresh manager
export const useRefreshManager = (): RefreshManager => {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const register = useCallback((key: string, callback: () => Promise<void>, config: RefreshConfig) => {
    if (!mountedRef.current) return;
    
    // Wrap callback to check if component is still mounted
    const wrappedCallback = async () => {
      if (mountedRef.current) {
        await callback();
      }
    };
    
    refreshManagerInstance.register(key, wrappedCallback, config);
  }, []);

  const unregister = useCallback((key: string) => {
    refreshManagerInstance.unregister(key);
  }, []);

  const refresh = useCallback(async (key: string, force?: boolean) => {
    if (mountedRef.current) {
      await refreshManagerInstance.refresh(key, force);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (mountedRef.current) {
      await refreshManagerInstance.refreshAll();
    }
  }, []);

  const updateConfig = useCallback((key: string, config: Partial<RefreshConfig>) => {
    refreshManagerInstance.updateConfig(key, config);
  }, []);

  return {
    register,
    unregister,
    refresh,
    refreshAll,
    updateConfig
  };
};

// Debug utilities
export const getRefreshManagerStatus = () => {
  return refreshManagerInstance.getStatus();
};

export const destroyRefreshManager = () => {
  refreshManagerInstance.destroy();
};