import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = window.location.origin;


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
        ...options.headers, // ✅ Put custom headers LAST to override defaults
        ...(token && !options.headers?.Authorization && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (options.body && fetchOptions.method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    
    return fetch(url, fetchOptions);
  };


  const getTasks = async () => {
    
    
    
    
    
    if (!token) {
      console.error('🔥 No token available for getTasks');
      throw new Error('No authentication token');
    }
    
    const url = `${API_BASE_URL}/api/proxy?endpoint=tasks`;
    
    
    const fetchOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    
    
    
    try {
      const response = await fetch(url, fetchOptions);
      
      
      
      if (!response.ok) {
        console.error('🔥 Response not ok:', response.status);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
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
      
      
      
      
      
      if (!token) {
        console.error('💎 No token available for getResult');
        throw new Error('No authentication token');
      }
      
      if (!taskId) {
        console.error('💎 No taskId provided');
        throw new Error('No task ID provided');
      }
      
      const url = `${API_BASE_URL}/api/proxy?endpoint=result/${taskId}`;
      
      
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      };
      
      
      
      
      try {
        const response = await fetch(url, fetchOptions);
        
        
        
        if (!response.ok) {
          console.error('💎 Response not ok:', response.status);
          if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return data;
        
      } catch (error) {
        console.error('💎 getResult error:', error);
        console.error('💎 Error type:', error.constructor.name);
        console.error('💎 Error message:', error.message);
        throw error;
      }
    };
    
// Replace your uploadCall function with this:
    // Replace your uploadCall function with this:

// Replace uploadCall function:

const uploadCall = async (formData) => {
    
    
    for (let [key, value] of formData.entries()) {
        
    }
    
    const url = `${API_BASE_URL}/api/proxy?endpoint=submit`;
    
    
    const fetchOptions = {
        method: 'POST',
        headers: {
            // ✅ ONLY Authorization - browser sets Content-Type automatically with boundary
            'Authorization': `Bearer ${token}`
            // ❌ REMOVE: 'Content-Type': 'multipart/form-data'
        },
        body: formData
    };
    
    
    
    
    try {
        const response = await fetch(url, fetchOptions);
        
        return response;
    } catch (error) {
        console.error('📤 uploadCall error:', error);
        throw error;
    }
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
      
      
      // ✅ Direct fetch call to avoid circular dependency
      const url = `${API_BASE_URL}/api/proxy?endpoint=validate-token`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${checkToken}`
        }
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