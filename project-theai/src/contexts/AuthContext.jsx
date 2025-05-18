import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is logged in on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // You could validate the token with the server here
    }
    setLoading(false);
  }, []);
  
  // Login function
const login = async (username, password) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/login', {
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
      return { success: false, error: "Invalid username or password" };
    }
    
    if (!response.ok) {
      return { success: false, error: "Login failed. Please check your connection and try again later." };
    }
    
    const data = await response.json();
    const { access_token } = data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: "Network error. Please check your connection." };
  }
};
  // Register function
const register = async (username, email, password) => {
  try {
    const response = await fetch('http://127.0.0.1:8000/register', {
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return false;
    }
    
    const data = await response.json();
    const { access_token } = data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    return true;
  } catch (error) {
    console.error('Registration error:', error);
    return false;
  }
};
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };
  
  const value = {
    currentUser,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token
  };
  
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}