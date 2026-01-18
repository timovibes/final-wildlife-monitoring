// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Shared Components
import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Dashboard Components (Using aliases because names are identical)
import AdminDashboard from './components/admin/Dashboard';
import RangerDashboard from './components/ranger/Dashboard';
import ResearcherDashboard from './components/researcher/Dashboard';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
  {/* Public Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Generic Dashboard Route - Add this! */}
  <Route path="/dashboard" element={
    <ProtectedRoute>
      {/* This logic assumes your auth service stores the user role */}
      <DashboardRedirect />
    </ProtectedRoute>
  } />

  {/* Role-Specific Routes */}
  <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
  <Route path="/ranger" element={<ProtectedRoute role="ranger"><RangerDashboard /></ProtectedRoute>} />
  <Route path="/researcher" element={<ProtectedRoute role="researcher"><ResearcherDashboard /></ProtectedRoute>} />

  <Route path="/" element={<Navigate to="/login" />} />
</Routes>
      </div>
    </Router>
  );
}

function DashboardRedirect() {
  // Check your localStorage or Auth context for the user's role
  const user = JSON.parse(localStorage.getItem('user')); 
  
  if (!user) return <Navigate to="/login" />;
  
  // Send them to their specific folder-based dashboard
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'ranger') return <Navigate to="/ranger" />;
  if (user.role === 'researcher') return <Navigate to="/researcher" />;
  
  return <Navigate to="/login" />;
}

export default App;