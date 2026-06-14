import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

/**
 * Wraps any public route that should only be accessible when logged out.
 * Authenticated users are redirected to the dashboard.
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // If there's a previous page the user tried to go to, redirect them back there. Otherwise go to /dashboard.
  const from = location.state?.from?.pathname || '/dashboard';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bgDark">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicRoute;
