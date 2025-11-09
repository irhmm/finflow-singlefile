import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireCanEdit?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false,
  requireCanEdit = false
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperAdmin, canEdit } = useAuth();
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

    if (requireCanEdit && !canEdit) {
      // Requires edit permission but user doesn't have it
      navigate('/');
      return;
    }

    if (requireAdmin && !isAdmin && !isSuperAdmin) {
      // Requires admin but user isn't admin or super admin
      navigate('/');
      return;
    }
  }, [user, loading, isAdmin, isSuperAdmin, canEdit, requireAdmin, requireSuperAdmin, requireCanEdit, navigate]);

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

  if (requireCanEdit && !canEdit) {
    return null; // Will redirect in useEffect
  }

  if (requireAdmin && !isAdmin && !isSuperAdmin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}