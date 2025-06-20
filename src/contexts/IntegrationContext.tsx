// src/contexts/IntegrationContext.tsx - Fixed API endpoints to match backend

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { useAuthenticatedFetch } from './AuthContext';

interface FeatureState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  lastUpdated: string | null;
  data: any;
}

interface IntegrationStats {
  activeSyncs: number;
  failedSyncs: number;
  totalDataSources: number;
  lastSyncTime: string | null;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  feature?: string;
  read?: boolean;
}

interface IntegrationState {
  features: {
    fileUpload: FeatureState;
    conversationalAI: FeatureState;
    queryBuilder: FeatureState;
    dashboardBuilder: FeatureState;
    aiAssistant: FeatureState;
  };
  integrationStats: IntegrationStats;
  crossFeatureData: Record<string, any>;
  notifications: Notification[];
  activeConnections: Record<string, boolean>;
  isRefreshing: boolean;
  featureState?: FeatureState;
}

type IntegrationAction =
  | { type: 'SET_FEATURE_STATE'; payload: { feature: keyof IntegrationState['features']; state: Partial<FeatureState> } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'UPDATE_INTEGRATION_STATS'; payload: Partial<IntegrationStats> }
  | { type: 'SET_CROSS_FEATURE_DATA'; payload: { key: string; data: any } }
  | { type: 'UPDATE_ACTIVE_CONNECTION'; payload: { feature: string; status: boolean } }
  | { type: 'SET_REFRESHING'; payload: boolean };

const initialState: IntegrationState = {
  features: {
    fileUpload: { status: 'idle', lastUpdated: null, data: null },
    conversationalAI: { status: 'idle', lastUpdated: null, data: null },
    queryBuilder: { status: 'idle', lastUpdated: null, data: null },
    dashboardBuilder: { status: 'idle', lastUpdated: null, data: null },
    aiAssistant: { status: 'idle', lastUpdated: null, data: null },
  },
  integrationStats: {
    activeSyncs: 0,
    failedSyncs: 0,
    totalDataSources: 0,
    lastSyncTime: null,
  },
  crossFeatureData: {},
  notifications: [],
  activeConnections: {},
  isRefreshing: false,
};

function integrationReducer(state: IntegrationState, action: IntegrationAction): IntegrationState {
  switch (action.type) {
    case 'SET_FEATURE_STATE':
      return {
        ...state,
        features: {
          ...state.features,
          [action.payload.feature]: {
            ...state.features[action.payload.feature],
            ...action.payload.state,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Keep last 50 notifications
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };

    case 'UPDATE_INTEGRATION_STATS':
      return {
        ...state,
        integrationStats: {
          ...state.integrationStats,
          ...action.payload,
        },
      };

    case 'SET_CROSS_FEATURE_DATA':
      return {
        ...state,
        crossFeatureData: {
          ...state.crossFeatureData,
          [action.payload.key]: action.payload.data,
        },
      };

    case 'UPDATE_ACTIVE_CONNECTION':
      return {
        ...state,
        activeConnections: {
          ...state.activeConnections,
          [action.payload.feature]: action.payload.status,
        },
      };

    case 'SET_REFRESHING':
      return {
        ...state,
        isRefreshing: action.payload,
      };

    default:
      return state;
  }
}

interface IntegrationContextType {
  state: IntegrationState;
  actions: {
    setFeatureState: (feature: keyof IntegrationState['features'], state: Partial<FeatureState>) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
    markNotificationAsRead: (id: string) => void;
    syncDataSources: () => Promise<void>;
    setCrossFeatureData: (key: string, data: any) => void;
    getCrossFeatureData: (key: string) => any;
    updateActiveConnection: (feature: string, status: boolean) => void;
    refreshIntegrationData: () => Promise<void>;
  };
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const useIntegration = () => {
  const context = useContext(IntegrationContext);
  if (context === undefined) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};

interface IntegrationProviderProps {
  children: React.ReactNode;
}

export const IntegrationProvider: React.FC<IntegrationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(integrationReducer, initialState);
  const authenticatedFetch = useAuthenticatedFetch();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setFeatureState = useCallback((feature: keyof IntegrationState['features'], featureState: Partial<FeatureState>) => {
    if (mountedRef.current) {
      dispatch({ type: 'SET_FEATURE_STATE', payload: { feature, state: featureState } });
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (mountedRef.current) {
      const fullNotification: Notification = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });

      // Auto-remove success notifications after 5 seconds
      if (notification.type === 'success') {
        setTimeout(() => {
          if (mountedRef.current) {
            dispatch({ type: 'REMOVE_NOTIFICATION', payload: fullNotification.id });
          }
        }, 5000);
      }
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    if (mountedRef.current) {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
    }
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    if (mountedRef.current) {
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    }
  }, []);

  const clearNotifications = useCallback(() => {
    if (mountedRef.current) {
      dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    }
  }, []);

  // FIXED: Updated syncDataSources to use correct backend endpoint
  const syncDataSources = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setFeatureState('fileUpload', { status: 'processing' });
      dispatch({ type: 'SET_REFRESHING', payload: true });
      
      // FIXED: First get all user data sources
      const dataSourcesResponse = await authenticatedFetch('http://localhost:8000/api/integration/data-sources');
      
      if (dataSourcesResponse.ok && mountedRef.current) {
        const dataSourcesData = await dataSourcesResponse.json();
        const dataSources = dataSourcesData.sources || [];
        
        // FIXED: Sync each data source individually using the correct endpoint
        const syncPromises = dataSources.map(async (source: any) => {
          try {
            const syncResponse = await authenticatedFetch(`http://localhost:8000/api/integration/data-sources/${source.source_id}/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                features: ['all'], // Sync with all features
                force_refresh: true
              })
            });
            
            return { sourceId: source.source_id, success: syncResponse.ok };
          } catch (error) {
            console.error(`Failed to sync source ${source.source_id}:`, error);
            return { sourceId: source.source_id, success: false };
          }
        });

        const syncResults = await Promise.all(syncPromises);
        const successfulSyncs = syncResults.filter(result => result.success).length;
        const failedSyncs = syncResults.filter(result => !result.success).length;

        if (mountedRef.current) {
          dispatch({
            type: 'UPDATE_INTEGRATION_STATS',
            payload: { 
              activeSyncs: state.integrationStats.activeSyncs + successfulSyncs,
              failedSyncs: state.integrationStats.failedSyncs + failedSyncs,
              totalDataSources: dataSources.length,
              lastSyncTime: new Date().toISOString() 
            }
          });

          setFeatureState('fileUpload', { status: 'completed' });
          
          if (successfulSyncs > 0) {
            addNotification({
              type: 'success',
              title: 'Data Sources Synced',
              message: `Successfully synced ${successfulSyncs} data source(s) across all features`,
              feature: 'integration'
            });
          }

          if (failedSyncs > 0) {
            addNotification({
              type: 'warning',
              title: 'Partial Sync Completed',
              message: `${failedSyncs} data source(s) failed to sync`,
              feature: 'integration'
            });
          }
        }
      } else {
        throw new Error('Failed to fetch data sources');
      }

    } catch (error) {
      console.error('Sync error:', error);
      if (mountedRef.current) {
        setFeatureState('fileUpload', { status: 'error' });
        dispatch({
          type: 'UPDATE_INTEGRATION_STATS',
          payload: { failedSyncs: state.integrationStats.failedSyncs + 1 }
        });
        
        addNotification({
          type: 'error',
          title: 'Sync Failed',
          message: 'Failed to synchronize data sources. Please try again.',
          feature: 'integration'
        });
      }
    } finally {
      if (mountedRef.current) {
        dispatch({ type: 'SET_REFRESHING', payload: false });
      }
    }
  }, [authenticatedFetch, setFeatureState, addNotification, state.integrationStats]);

  const setCrossFeatureData = useCallback((key: string, data: any) => {
    if (mountedRef.current) {
      dispatch({ type: 'SET_CROSS_FEATURE_DATA', payload: { key, data } });
    }
  }, []);

  const getCrossFeatureData = useCallback((key: string) => {
    return state.crossFeatureData[key];
  }, [state.crossFeatureData]);

  const updateActiveConnection = useCallback((feature: string, status: boolean) => {
    if (mountedRef.current) {
      dispatch({ type: 'UPDATE_ACTIVE_CONNECTION', payload: { feature, status } });
    }
  }, []);

  // FIXED: Updated refresh function to use correct endpoints
  const refreshIntegrationData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      dispatch({ type: 'SET_REFRESHING', payload: true });

      // FIXED: Use existing backend endpoints
      const [dataSourcesRes, systemStatsRes] = await Promise.all([
        authenticatedFetch('http://localhost:8000/api/integration/data-sources'),
        authenticatedFetch('http://localhost:8000/api/integration/system-statistics')
      ]);

      if (dataSourcesRes.ok && mountedRef.current) {
        const dataSourcesData = await dataSourcesRes.json();
        dispatch({
          type: 'UPDATE_INTEGRATION_STATS',
          payload: {
            totalDataSources: dataSourcesData.sources?.length || 0
          }
        });
      }

      if (systemStatsRes.ok && mountedRef.current) {
        const statsData = await systemStatsRes.json();
        // Update integration stats with system data if available
        const userStats = statsData.user_statistics || {};
        dispatch({
          type: 'UPDATE_INTEGRATION_STATS',
          payload: {
            totalDataSources: userStats.total_data_sources || state.integrationStats.totalDataSources
          }
        });
      }

    } catch (error) {
      console.error('Failed to refresh integration data:', error);
      if (mountedRef.current) {
        addNotification({
          type: 'error',
          title: 'Refresh Failed',
          message: 'Failed to refresh integration data',
          feature: 'integration'
        });
      }
    } finally {
      if (mountedRef.current) {
        dispatch({ type: 'SET_REFRESHING', payload: false });
      }
    }
  }, [authenticatedFetch, addNotification, state.integrationStats.totalDataSources]);

  // Auto-refresh integration data every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current && !state.isRefreshing) {
        refreshIntegrationData();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [refreshIntegrationData, state.isRefreshing]);

  // Initial data load
  useEffect(() => {
    refreshIntegrationData();
  }, [refreshIntegrationData]);

  const contextValue: IntegrationContextType = {
    state,
    actions: {
      setFeatureState,
      addNotification,
      removeNotification,
      clearNotifications,
      markNotificationAsRead,
      syncDataSources,
      setCrossFeatureData,
      getCrossFeatureData,
      updateActiveConnection,
      refreshIntegrationData,
    },
  };

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  );
};