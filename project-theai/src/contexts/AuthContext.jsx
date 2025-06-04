import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Use your own Vercel URL as the API base
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
    const url = `${API_BASE_URL}/api/proxy?endpoint=${endpoint}`;
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    if (options.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    return fetch(url, fetchOptions);
  };

  // File upload function (for FormData)
  const uploadCall = async (formData) => {
    const url = `${API_BASE_URL}/api/upload`;
    
    return fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
        // Don't set Content-Type for FormData - browser sets multipart boundary
      },
      body: formData
    });
  };
  
  // Validate token function
  const validateToken = async (tokenToValidate = null) => {
    const checkToken = tokenToValidate || token || localStorage.getItem('token');
    
    if (!checkToken) {
      setLoading(false);
      setIsAuthenticated(false);
      return false;
    }

    try {
      const response = await apiCall('validate-token', {
        headers: { 'Authorization': `Bearer ${checkToken}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        setToken(checkToken);
        setIsAuthenticated(true);
        localStorage.setItem('token', checkToken);
        setLoading(false);
        return true;
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Token validation error:', error);
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
    try {
      const response = await apiCall('login', {
        method: 'POST',
        body: { username, password }
      });
      
      if (response.status === 401) {
        return false;
      }
      
      if (response.ok) {
        const data = await response.json();
        const newToken = data.access_token;
        
        const isValid = await validateToken(newToken);
        return isValid;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
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
    apiCall,    // For JSON API calls
    uploadCall  // For file uploads
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}