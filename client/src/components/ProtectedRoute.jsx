import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requirePermission, requireRole }) => {
  const { user, loading, isAdmin, role, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-secondary-container animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminUser = role === 'super_admin' || role === 'admin' || role === 'content_manager' || role === 'order_manager';

  if (requireAdmin && !isAdminUser) {
    return <Navigate to="/" replace />;
  }

  if (requirePermission && !hasPermission(requirePermission)) {
    return <Navigate to="/admin" replace />;
  }

  if (requireRole && role !== requireRole && role !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
