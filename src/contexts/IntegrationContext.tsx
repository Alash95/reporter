// src/contexts/IntegrationContext.tsx - Cross-feature integration state management

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useAuthenticatedFetch } from '../contexts/AuthContext';

interface DataSource {
  source_id: string;
  source_name: string;
  source_type: string;
  data_type: string;
  schema: any;
  semantic_model_id?: string;
  status: string;
  feature_integrations: Record<string, any>;
}

interface IntegrationState {
  dataSources: DataSource[];
  activeConnections: Record<string, boolean>;
  crossFeatureData: Record<string, any>;
  notifications: Notification[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'error';
    services: Record<string, string>;
    lastCheck: string;
  };
  featureStates: {
    fileUpload: 'idle' | 'processing' | 'completed' | 'error';
    conversationalAI: 'idle' | 'thinking' | 'responding' | 'error';
    queryBuilder: 'idle' | 'executing' | 'completed' | 'error';
    dashboardBuilder: 'idle' | 'building' | 'saved' | 'error';
    aiAssistant: 'idle' | 'analyzing' | 'responding' | 'error';
  };
  integrationStats: {
    totalDataSources: number;
    activeIntegrations: number;
    successfulSyncs: number;
    failedSyncs: number;
  };
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  feature?: string;
  data?: any;
}

type IntegrationAction =
  | { type: 'SET_DATA_SOURCES'; payload: DataSource[] }
  | { type: 'ADD_DATA_SOURCE'; payload: DataSource }
  | { type: 'UPDATE_DATA_SOURCE'; payload: { id: string; updates: Partial<DataSource> } }
  | { type: 'REMOVE_DATA_SOURCE'; payload: string }
  | { type: 'SET_FEATURE_STATE'; payload: { feature: keyof IntegrationState['featureStates']; state: string } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_SYSTEM_HEALTH'; payload: IntegrationState['systemHealth'] }
  | { type: 'UPDATE_INTEGRATION_STATS'; payload: Partial<IntegrationState['integrationStats']> }
  | { type: 'SET_CROSS_FEATURE_DATA'; payload: { key: string; data: any } }
  | { type: 'UPDATE_ACTIVE_CONNECTION'; payload: { feature: string; status: boolean } };

const initialState: IntegrationState = {
  dataSources: [],
  activeConnections: {},
  crossFeatureData: {},
  notifications: [],
  systemHealth: {
    status: 'healthy',
    services: {},
    lastCheck: new Date().toISOString()
  },
  featureStates: {
    fileUpload: 'idle',
    conversationalAI: 'idle',
    queryBuilder: 'idle',
    dashboardBuilder: 'idle',
    aiAssistant: 'idle'
  },
  integrationStats: {
    totalDataSources: 0,
    activeIntegrations: 0,
    successfulSyncs: 0,
    failedSyncs: 0
  }
};

function integrationReducer(state: IntegrationState, action: IntegrationAction): IntegrationState {
  switch (action.type) {
    case 'SET_DATA_SOURCES':
      return {
        ...state,
        dataSources: action.payload,
        integrationStats: {
          ...state.integrationStats,
          totalDataSources: action.payload.length,
          activeIntegrations: action.payload.filter(ds => ds.status === 'available').length
        }
      };

    case 'ADD_DATA_SOURCE':
      const newDataSources = [...state.dataSources, action.payload];
      return {
        ...state,
        dataSources: newDataSources,
        integrationStats: {
          ...state.integrationStats,
          totalDataSources: newDataSources.length,
          activeIntegrations: newDataSources.filter(ds => ds.status === 'available').length
        }
      };

    case 'UPDATE_DATA_SOURCE':
      return {
        ...state,
        dataSources: state.dataSources.map(ds =>
          ds.source_id === action.payload.id ? { ...ds, ...action.payload.updates } : ds
        )
      };

    case 'REMOVE_DATA_SOURCE':
      const filteredDataSources = state.dataSources.filter(ds => ds.source_id !== action.payload);
      return {
        ...state,
        dataSources: filteredDataSources,
        integrationStats: {
          ...state.integrationStats,
          totalDataSources: filteredDataSources.length,
          activeIntegrations: filteredDataSources.filter(ds => ds.status === 'available').length
        }
      };

    case 'SET_FEATURE_STATE':
      return {
        ...state,
        featureStates: {
          ...state.featureStates,
          [action.payload.feature]: action.payload.state as any
        }
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications.slice(0, 49)] // Keep only 50 notifications
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case 'SET_SYSTEM_HEALTH':
      return {
        ...state,
        systemHealth: action.payload
      };

    case 'UPDATE_INTEGRATION_STATS':
      return {
        ...state,
        integrationStats: {
          ...state.integrationStats,
          ...action.payload
        }
      };

    case 'SET_CROSS_FEATURE_DATA':
      return {
        ...state,
        crossFeatureData: {
          ...state.crossFeatureData,
          [action.payload.key]: action.payload.data
        }
      };

    case 'UPDATE_ACTIVE_CONNECTION':
      return {
        ...state,
        activeConnections: {
          ...state.activeConnections,
          [action.payload.feature]: action.payload.status
        }
      };

    default:
      return state;
  }
}

interface IntegrationContextType {
  state: IntegrationState;
  actions: {
    loadDataSources: () => Promise<void>;
    addDataSource: (dataSource: DataSource) => void;
    updateDataSource: (id: string, updates: Partial<DataSource>) => void;
    removeDataSource: (id: string) => void;
    setFeatureState: (feature: keyof IntegrationState['featureStates'], state: string) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    checkSystemHealth: () => Promise<void>;
    syncDataSources: () => Promise<void>;
    setCrossFeatureData: (key: string, data: any) => void;
    getCrossFeatureData: (key: string) => any;
    updateActiveConnection: (feature: string, status: boolean) => void;
  };
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const useIntegration = (): IntegrationContextType => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  return context;
};

interface IntegrationProviderProps {
  children: ReactNode;
}

export const IntegrationProvider: React.FC<IntegrationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(integrationReducer, initialState);
  
  // ✅ FIXED: Properly call the hook to get the authenticatedFetch function
  const authenticatedFetch = useAuthenticatedFetch();

  // Create stable functions that use the authenticatedFetch
  const loadDataSources = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/integration/data-sources');
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_DATA_SOURCES', payload: data.sources });
      }
    } catch (error) {
      console.error('Failed to load data sources:', error);
      addNotification({
        type: 'error',
        title: 'Data Sources Error',
        message: 'Failed to load data sources',
        feature: 'integration'
      });
    }
  };

  const addDataSource = (dataSource: DataSource) => {
    dispatch({ type: 'ADD_DATA_SOURCE', payload: dataSource });
    addNotification({
      type: 'success',
      title: 'Data Source Added',
      message: `${dataSource.source_name} has been successfully integrated`,
      feature: 'integration'
    });
  };

  const updateDataSource = (id: string, updates: Partial<DataSource>) => {
    dispatch({ type: 'UPDATE_DATA_SOURCE', payload: { id, updates } });
  };

  const removeDataSource = (id: string) => {
    dispatch({ type: 'REMOVE_DATA_SOURCE', payload: id });
    addNotification({
      type: 'info',
      title: 'Data Source Removed',
      message: 'Data source has been removed from integration',
      feature: 'integration'
    });
  };

  const setFeatureState = (feature: keyof IntegrationState['featureStates'], featureState: string) => {
    dispatch({ type: 'SET_FEATURE_STATE', payload: { feature, state: featureState } });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const fullNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: fullNotification });

    // Auto-remove notifications after 10 seconds for non-error types
    if (notification.type !== 'error') {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: fullNotification.id });
      }, 10000);
    }
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const checkSystemHealth = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:8000/api/system/status');
      if (response.ok) {
        const healthData = await response.json();
        dispatch({
          type: 'SET_SYSTEM_HEALTH',
          payload: {
            status: healthData.status,
            services: healthData.services,
            lastCheck: new Date().toISOString()
          }
        });

        if (healthData.statistics) {
          dispatch({
            type: 'UPDATE_INTEGRATION_STATS',
            payload: {
              successfulSyncs: healthData.statistics.successful_syncs || 0,
              failedSyncs: healthData.statistics.failed_syncs || 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to check system health:', error);
      dispatch({
        type: 'SET_SYSTEM_HEALTH',
        payload: {
          status: 'error',
          services: {},
          lastCheck: new Date().toISOString()
        }
      });
    }
  };

  const syncDataSources = async () => {
    try {
      setFeatureState('fileUpload', 'processing');
      
      for (const dataSource of state.dataSources) {
        try {
          const response = await authenticatedFetch(`http://localhost:8000/api/integration/data-sources/${dataSource.source_id}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_id: dataSource.source_id,
              features: ['conversational_ai', 'query_builder', 'dashboard_builder', 'ai_assistant'],
              force_refresh: false
            })
          });

          if (response.ok) {
            dispatch({
              type: 'UPDATE_INTEGRATION_STATS',
              payload: { successfulSyncs: state.integrationStats.successfulSyncs + 1 }
            });
          } else {
            dispatch({
              type: 'UPDATE_INTEGRATION_STATS',
              payload: { failedSyncs: state.integrationStats.failedSyncs + 1 }
            });
          }
        } catch (error) {
          console.error(`Failed to sync data source ${dataSource.source_id}:`, error);
          dispatch({
            type: 'UPDATE_INTEGRATION_STATS',
            payload: { failedSyncs: state.integrationStats.failedSyncs + 1 }
          });
        }
      }

      setFeatureState('fileUpload', 'completed');
      addNotification({
        type: 'success',
        title: 'Data Sources Synced',
        message: 'All data sources have been synchronized across features',
        feature: 'integration'
      });

    } catch (error) {
      setFeatureState('fileUpload', 'error');
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to synchronize data sources',
        feature: 'integration'
      });
    }
  };

  const setCrossFeatureData = (key: string, data: any) => {
    dispatch({ type: 'SET_CROSS_FEATURE_DATA', payload: { key, data } });
  };

  const getCrossFeatureData = (key: string) => {
    return state.crossFeatureData[key];
  };

  const updateActiveConnection = (feature: string, status: boolean) => {
    dispatch({ type: 'UPDATE_ACTIVE_CONNECTION', payload: { feature, status } });
  };

  // Auto-refresh data sources every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDataSources();
      checkSystemHealth();
    }, 30000);

    // Initial load
    loadDataSources();
    checkSystemHealth();

    return () => clearInterval(interval);
  }, []); // ✅ FIXED: Empty dependency array since functions are stable

  const contextValue: IntegrationContextType = {
    state,
    actions: {
      loadDataSources,
      addDataSource,
      updateDataSource,
      removeDataSource,
      setFeatureState,
      addNotification,
      removeNotification,
      checkSystemHealth,
      syncDataSources,
      setCrossFeatureData,
      getCrossFeatureData,
      updateActiveConnection
    }
  };

  return (
    <IntegrationContext.Provider value={contextValue}>
      {children}
    </IntegrationContext.Provider>
  );
};