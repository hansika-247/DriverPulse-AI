import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/**
 * Wraps any route that requires authentication.
 * Unauthenticated users are redirected to /login with the
 * original destination saved in location.state.from so we
 * can redirect back after successful login.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // While hydrating JWT from localStorage, show nothing (avoid flash)
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bgDark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
