import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    // Redirect to the user's actual dashboard based on their role
    const roleDashboards = {
      admin: '/admin',
      expert: '/expert',
      user: '/dashboard',
    };
    const redirectTo = roleDashboards[user?.role] || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
