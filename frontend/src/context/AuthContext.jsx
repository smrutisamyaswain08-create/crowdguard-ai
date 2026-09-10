import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const API_URL = window.location.port === '5173' ? '/api' : `http://${window.location.hostname}:8000/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);

  const clearLocalSession = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('login_time');
    setToken(null);
    setUser(null);
  };

  // Set default auth headers on api fetch helper
  const apiFetch = async (endpoint, options = {}) => {
    let cleanEndpoint = endpoint;
    if (!cleanEndpoint.startsWith('http')) {
      if (cleanEndpoint.startsWith('/api/')) {
        cleanEndpoint = cleanEndpoint.replace('/api', '');
      } else if (cleanEndpoint.startsWith('api/')) {
        cleanEndpoint = cleanEndpoint.replace('api', '');
      }
      if (!cleanEndpoint.startsWith('/')) {
        cleanEndpoint = '/' + cleanEndpoint;
      }
    }

    const url = cleanEndpoint.startsWith('http') ? cleanEndpoint : `${API_URL}${cleanEndpoint}`;
    
    const headers = {
      ...options.headers,
    };
    
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    const currentToken = localStorage.getItem('access_token');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/logout')) {
      clearLocalSession();
      throw new Error('Authentication expired. Please log in again.');
    }

    return response;
  };

  const loadUserProfile = async (tokenVal) => {
    try {
      const res = await fetch(`${API_URL}/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${tokenVal}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        clearLocalSession();
      }
    } catch (e) {
      console.error("Error loading user profile", e);
      clearLocalSession();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkTokenExpiry = () => {
      const loginTime = localStorage.getItem('login_time');
      if (loginTime) {
        const elapsed = Date.now() - parseInt(loginTime, 10);
        const fourHours = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
        if (elapsed >= fourHours) {
          clearLocalSession();
          return true;
        }
      } else if (token) {
        localStorage.setItem('login_time', Date.now().toString());
      }
      return false;
    };

    if (token) {
      if (checkTokenExpiry()) {
        setIsLoading(false);
        return;
      }
      loadUserProfile(token);

      const interval = setInterval(() => {
        checkTokenExpiry();
      }, 10000);

      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('login_time', Date.now().toString());
        setToken(data.access);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.detail || 'Invalid username or password' };
      }
    } catch (e) {
      return { success: false, error: 'Network error connecting to backend server' };
    }
  };

  const logout = async () => {
    const curToken = localStorage.getItem('access_token');
    clearLocalSession();
    if (curToken) {
      try {
        await fetch(`${API_URL}/auth/logout/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${curToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        console.error("Failed to log logout event on backend", e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
