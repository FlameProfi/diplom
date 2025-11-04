import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasPermission, Role } from '../utils/roles'

interface ProtectedRouteProps {
  requiredRole: Role;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user.role as Role, requiredRole)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
