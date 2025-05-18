import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LandingPage from "../pages/LandingPage";
import UploadPage from "../pages/UploadPage";
import TasksPage from "../pages/TasksPage";
import ResultPage from "../pages/ResultPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div>
    </div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

// Public route - redirects to dashboard if already authenticated
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div>
    </div>;
  }
  
  return isAuthenticated ? <Navigate to="/" /> : children;
}

export default function GeneralRouter() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      <Route path="/register" element={
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <LandingPage />
        </ProtectedRoute>
      } />
      
      <Route path="/upload" element={
        <ProtectedRoute>
          <UploadPage />
        </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute>
          <TasksPage />
        </ProtectedRoute>
      } />
      
      <Route path="/result/:taskId" element={
        <ProtectedRoute>
          <ResultPage />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}