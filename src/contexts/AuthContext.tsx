import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Standalone useAuthenticatedFetch hook that can be imported separately
export const useAuthenticatedFetch = () => {
  const { token, logout } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    // Prepare headers - convert to a plain object for easier manipulation
    const headers: Record<string, string> = {};
    
    // Copy existing headers
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    // Add Content-Type only if not already set and not FormData
    if (!headers['Content-Type'] && !headers['content-type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.warn('Authentication failed - logging out user');
        logout();
        throw new Error('Authentication failed. Please login again.');
      }

      return response;
    } catch (error) {
      // Network errors or other fetch failures
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  };

  return authenticatedFetch;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

  useEffect(() => {
    // Check for stored token on app load
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by checking with the server
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setToken(storedToken);
            setUser(userData);
            console.log('✅ Session restored for:', userData.email);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            console.log('🔄 Session expired, please login again');
          }
        } catch (error) {
          // Network error or server down, use stored data
          try {
            const parsedUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
            console.log('📱 Using cached session for:', parsedUser.email);
          } catch (parseError) {
            // Stored data is corrupted, clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            console.log('🧹 Cleared corrupted session data');
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [API_BASE_URL]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 401) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (response.status === 422) {
          throw new Error('Please enter a valid email address and password.');
        } else {
          throw new Error(errorData.detail || 'Login failed. Please try again.');
        }
      }

      const data = await response.json();
      
      setToken(data.access_token);
      setUser(data.user);
      
      // Store in localStorage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      console.log('✅ Login successful:', data.user.email);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (response.status === 400 && errorData.detail?.includes('already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        } else if (response.status === 422) {
          // Validation error
          const validationErrors = errorData.detail || [];
          const errorMessages = validationErrors.map((err: any) => err.msg || err.message).join(', ');
          throw new Error(errorMessages || 'Please check your input and try again.');
        } else {
          throw new Error(errorData.detail || 'Signup failed. Please try again.');
        }
      }

      const data = await response.json();
      
      setToken(data.access_token);
      setUser(data.user);
      
      // Store in localStorage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      
      console.log('✅ User account created successfully:', data.user.email);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = (): void => {
    console.log('🚪 Logging out...');
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  // Additional utility function for getting fresh user data
  const refreshUser = async (): Promise<void> => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        // Token might be invalid, logout user
        logout();
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Additional utility hook for checking if user is authenticated
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

// Utility hook for getting user info
export const useUser = (): User | null => {
  const { user } = useAuth();
  return user;
};

// Utility hook for getting token
export const useToken = (): string | null => {
  const { token } = useAuth();
  return token;
};