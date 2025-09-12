import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Still loading, wait

    if (!user) {
      // Not authenticated, redirect to login
      navigate('/admin-login');
      return;
    }

    if (requireSuperAdmin && !isSuperAdmin) {
      // Requires super admin but user isn't one
      navigate('/');
      return;
    }

    if (requireAdmin && !isAdmin && !isSuperAdmin) {
      // Requires admin but user isn't admin or super admin
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, isSuperAdmin, requireAdmin, requireSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return null; // Will redirect in useEffect
  }

  if (requireAdmin && !isAdmin && !isSuperAdmin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}