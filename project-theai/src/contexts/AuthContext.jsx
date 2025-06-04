import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = window.location.origin;
console.log('API_BASE_URL:', API_BASE_URL);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Universal API call function (for JSON data)
  const apiCall = async (endpoint, options = {}) => {
    console.log(token);
    const url = `${API_BASE_URL}/api/proxy?endpoint=${endpoint}`;
    console.log(token);
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers, // ✅ Put custom headers LAST to override defaults
        ...(token && !options.headers?.Authorization && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (options.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    console.log('🔍 API Call:', { endpoint, url, headers: fetchOptions.headers });
    return fetch(url, fetchOptions);
  };


  const getTasks = async () => {
    console.log('🔥 getTasks called!');
    console.log('🔥 Token exists:', !!token);
    console.log('🔥 Token value:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    console.log('🔥 API_BASE_URL:', API_BASE_URL);
    
    if (!token) {
      console.error('🔥 No token available for getTasks');
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/api/proxy?endpoint=tasks`;
    console.log('🔥 Full URL:', url);
    
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    console.log('🔥 Fetch options:', fetchOptions);
    console.log('🔥 Making fetch request...');
    
    try {
      const response = await fetch(url, fetchOptions);
      console.log('🔥 Response received:', response.status, response.statusText);
      console.log('🔥 Response ok:', response.ok);
      
      if (!response.ok) {
        console.error('🔥 Response not ok:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔥 Tasks data:', data);
      return data;
      
    } catch (error) {
      console.error('🔥 getTasks error:', error);
      console.error('🔥 Error type:', error.constructor.name);
      console.error('🔥 Error message:', error.message);
      throw error;
    }
  };

  // Replace your incomplete getResult function with this complete one:

    // In AuthContext.jsx - complete the getResult function:
  const getResult = async (taskId) => {
      console.log('💎 getResult called for taskId:', taskId);
      console.log('💎 Token exists:', !!token);
      console.log('💎 Token value:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      console.log('💎 API_BASE_URL:', API_BASE_URL);
      
      if (!token) {
        console.error('💎 No token available for getResult');
        throw new Error('No authentication token');
      }
      
      if (!taskId) {
        console.error('💎 No taskId provided');
        throw new Error('No task ID provided');
      }
      
      const url = `${API_BASE_URL}/api/proxy?endpoint=result/${taskId}`;
      console.log('💎 Full URL:', url);
      
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      console.log('💎 Fetch options:', fetchOptions);
      console.log('💎 Making fetch request...');
      
      try {
        const response = await fetch(url, fetchOptions);
        console.log('💎 Response received:', response.status, response.statusText);
        console.log('💎 Response ok:', response.ok);
        
        if (!response.ok) {
          console.error('💎 Response not ok:', response.status);
          if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('💎 Result data:', data);
        return data;
        
      } catch (error) {
        console.error('💎 getResult error:', error);
        console.error('💎 Error type:', error.constructor.name);
        console.error('💎 Error message:', error.message);
        throw error;
      }
    };
    
  // File upload function (for FormData)
  const uploadCall = async (formData) => {
    const url = `${API_BASE_URL}/api/upload`;
    
    return fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
  };
  
  // Fixed validate token function
  const validateToken = async (tokenToValidate = null) => {
    const checkToken = tokenToValidate || token || localStorage.getItem('token');
    
    if (!checkToken) {
      setLoading(false);
      setIsAuthenticated(false);
      return false;
    }

    try {
      console.log('🔍 Validating token:', checkToken.substring(0, 20) + '...');
      
      // ✅ Direct fetch call to avoid circular dependency
      const url = `${API_BASE_URL}/api/proxy?endpoint=validate-token`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${checkToken}`
        }
      });

      console.log('🔍 Token validation response:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('🔍 User data:', userData);
        setCurrentUser(userData);
        setToken(checkToken);
        setIsAuthenticated(true);
        localStorage.setItem('token', checkToken);
        setLoading(false);
        return true;
      } else {
        console.log('🔍 Token validation failed');
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('🔍 Token validation error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    validateToken();
  }, []);
  
  // Login function
  const login = async (username, password) => {
    console.log('🔍 Login attempt:', { username });
    
    try {
      const response = await apiCall('login', {
        method: 'POST',
        body: { username, password }
      });
      
      console.log('🔍 Login response status:', response.status);
      
      if (response.status === 401) {
        return false;
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Login data:', data);
        const newToken = data.access_token;
        
        const isValid = await validateToken(newToken);
        return isValid;
      }
      
      return false;
    } catch (error) {
      console.error('🔍 Login error:', error);
      return false;
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      const response = await apiCall('register', {
        method: 'POST',
        body: { username, email, password }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newToken = data.access_token;
        
        const isValid = await validateToken(newToken);
        return isValid;
      }
      
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('current_task_id');
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    currentUser,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    validateToken,
    apiCall,
    uploadCall,
    getTasks,  // ✅ Add this
    getResult  // ✅ Add this
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}