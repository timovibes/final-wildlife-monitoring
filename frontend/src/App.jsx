import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AdminDashboard from './components/admin/Dashboard';
import RangerDashboard from './components/ranger/Dashboard';
import ResearcherDashboard from './components/researcher/Dashboard';
import ProtectedRoute from './components/shared/ProtectedRoute';
import OfflineIndicator from './components/shared/OfflineIndicator';
import syncManager from './utils/syncManager';
import authService from './services/auth';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = async () => {
      setIsOnline(true);
      // Attempt to sync pending data
      const hasPending = await syncManager.hasPendingData();
      if (hasPending) {
        setPendingSync(true);
        await syncManager.syncAll();
        setPendingSync(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending data on mount
    syncManager.hasPendingData().then(setPendingSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker for PWA functionality
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  }, []);

  const getDashboardByRole = (user) => {
    if (!user) return <Navigate to="/login" replace />;
    
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'ranger':
        return <RangerDashboard />;
      case 'researcher':
        return <ResearcherDashboard />;
      default:
        return <Navigate to="/login" replace />;
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <OfflineIndicator isOnline={isOnline} isPending={pendingSync} />
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {getDashboardByRole(authService.getCurrentUser())}
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/"
            element={
              authService.isAuthenticated() ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;