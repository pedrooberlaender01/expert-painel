import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'expert';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isSessionExpired, signOut } = useAuthStore();

  useEffect(() => {
    if (user && isSessionExpired()) {
      signOut();
    }
  }, [user, isSessionExpired, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // Role-based gate (per D-04): admin routes require role=admin
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
