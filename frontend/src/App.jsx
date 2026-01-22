import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AdminDashboard from './components/admin/Dashboard';
import RangerDashboard from './components/ranger/Dashboard';
import ResearcherDashboard from './components/researcher/Dashboard';
import ProtectedRoute from './components/shared/ProtectedRoute';
import OfflineIndicator from './components/shared/OfflineIndicator';
import Navbar from './components/shared/Navbar'; // Imported from your App.js logic
import syncManager from './services/syncManager';
import authService from './services/auth';

/**
 * AppContent handles the layout logic like conditional Navbars
 */
function AppContent({ isOnline, pendingSync }) {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  // Hide global Navbar on auth pages or if the dashboard has its own internal header
  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.includes(location.pathname);
  const dashboardPaths = ['/admin', '/ranger', '/researcher'];
  const isDashboardPage = dashboardPaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50">
      <OfflineIndicator isOnline={isOnline} isPending={pendingSync} />
      
      {/* Show Navbar only if logged in and not on specific excluded pages */}
      {!isAuthPage && !isDashboardPage && isAuthenticated && <Navbar user={user} />}
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Dynamic Redirect: Sends user to the correct dashboard based on tab-specific session */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        } />

        {/* Individual Protected Routes */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="admin">
            <div className="p-8"><h1>User Management (Coming Soon)</h1></div>
          </ProtectedRoute>
        } />

        <Route path="/admin/species" element={
          <ProtectedRoute requiredRole="admin">
            <div className="p-8"><h1>Species Management (Coming Soon)</h1></div>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <div className="p-8"><h1>System Reports Page</h1></div>
          </ProtectedRoute>
        } />
        
        <Route path="/ranger" element={
          <ProtectedRoute requiredRole="ranger">
            <RangerDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/researcher" element={
          <ProtectedRoute requiredRole="researcher">
            <ResearcherDashboard />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/**
 * Logic to determine which path to redirect to based on role
 */
function DashboardRedirect() {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" />;
  
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'ranger') return <Navigate to="/ranger" />;
  if (user.role === 'researcher') return <Navigate to="/researcher" />;
  
  return <Navigate to="/login" />;
}

/**
 * Root App Component
 */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const hasPending = await syncManager.hasPendingData();
      if (hasPending) {
        setPendingSync(true);
        await syncManager.syncAll();
        setPendingSync(false);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Router>
      <AppContent isOnline={isOnline} pendingSync={pendingSync} />
    </Router>
  );
}

export default App;