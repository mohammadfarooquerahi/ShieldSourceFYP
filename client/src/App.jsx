// ─────────────────────────────────────────────
// Shield-Source | Main App Router
// Defines all routes and role-based protection
// ─────────────────────────────────────────────
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Home           from './pages/Home';
import Login          from './pages/Login';
import Register       from './pages/Register';
import UserDashboard  from './pages/UserDashboard';
import ReportIncident from './pages/ReportIncident';
import ExpertDashboard from './pages/ExpertDashboard';
import AdminDashboard  from './pages/AdminDashboard';

// Route guard component
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public routes — anyone can access */}
      <Route path="/"         element={<Home />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected: User only */}
      <Route path="/dashboard" element={
        <ProtectedRoute role="user"><UserDashboard /></ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute role="user"><ReportIncident /></ProtectedRoute>
      } />

      {/* Protected: Expert only */}
      <Route path="/expert" element={
        <ProtectedRoute role="expert"><ExpertDashboard /></ProtectedRoute>
      } />

      {/* Protected: Admin only */}
      <Route path="/admin" element={
        <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
      } />

      {/* Fallback: redirect unknown paths to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
