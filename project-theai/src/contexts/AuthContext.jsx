import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE_URL = import.meta.env.VITE_APP_API_URL ;
console.log('API_BASE_URL:', import.meta.env.VITE_APP_API_URL);
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Validate token function - only call when needed
  const validateToken = async (tokenToValidate = null) => {
    const checkToken = tokenToValidate || token || localStorage.getItem('token');
    
    if (!checkToken) {
      setLoading(false);
      setIsAuthenticated(false);
      return false;
    }

     try {
            const response = await fetch(`${API_BASE_URL}/validate-token`, {  // FIXED
                method: 'GET',
                headers: {
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
        // Token invalid
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

  // Check token ONLY on initial load
  useEffect(() => {
    validateToken();
  }, []); // Empty dependency array - runs only once
  
  // Login function
    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {  // FIXED
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });
      
      if (response.status === 401) {
        return false;
      }
      
      if (response.ok) {
        const data = await response.json();
        const newToken = data.access_token;
        
        // Validate the new token
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
            const response = await fetch(`${API_BASE_URL}/register`, {  // FIXED
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            });
      
      if (response.ok) {
        const data = await response.json();
        const newToken = data.access_token;
        
        // Validate the new token
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
    validateToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}