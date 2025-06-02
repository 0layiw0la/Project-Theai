import { Routes, Route, Navigate } from "react-router-dom";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import LandingPage from "../pages/LandingPage";
import UploadPage from "../pages/UploadPage";
import TasksPage from "../pages/TasksPage";
import ResultPage from "../pages/ResultPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import InfoFormPage from "../pages/InfoFormPage";

// Protected route component - simplified
// function ProtectedRoute({ children }) {
//   const { currentUser, loading, isAuthenticated } = useAuth();
//   const navigate = useNavigate();

//   // Only redirect if loading is done and not authenticated
//   useEffect(() => {
//     if (!loading && !isAuthenticated) {
//       navigate('/login', { 
//         replace: true,
//         state: { message: 'Please login to continue.' }
//       });
//     }
//   }, [loading, isAuthenticated, navigate]);

//   // Show loading while checking authentication
//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div>
//         <p className="ml-4">Loading...</p>
//       </div>
//     );
//   }

//   // Show children only if authenticated
//   return isAuthenticated ? children : null;
// }

// // Public route - redirects to dashboard if already authenticated
// function PublicRoute({ children }) {
//   const { isAuthenticated, loading } = useAuth();
  
//   if (loading) {
//     return <div className="flex justify-center items-center min-h-screen">
//       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-main"></div>
//     </div>;
//   }
  
//   return isAuthenticated ? <Navigate to="/" /> : children;
// }

export default function GeneralRouter() {
  return (
    <Routes>
      <Route path="/login" element={
        // <PublicRoute>
          <LoginPage />
        // </PublicRoute>
      } />
      
      <Route path="/register" element={
        // <PublicRoute>
          <RegisterPage />
        // </PublicRoute>
      } />
      
      <Route path="/" element={
        // <ProtectedRoute>
          <LandingPage />
        // </ProtectedRoute>
      } />

      <Route path="/form" element={
        // <ProtectedRoute>
          <InfoFormPage />
        // </ProtectedRoute>
      } />
      
      <Route path="/upload" element={
        // <ProtectedRoute>
          <UploadPage />
        // </ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        // <ProtectedRoute>
          <TasksPage />
        // </ProtectedRoute>
      } />
      
      <Route path="/result/:taskId" element={
        // <ProtectedRoute>
          <ResultPage />
        // </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}