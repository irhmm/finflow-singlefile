import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  role: string;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('Gagal memuat data pengguna');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Role pengguna berhasil diubah menjadi ${newRole}`);
      loadUsers(); // Reload users
    } catch (error) {
      toast.error('Gagal mengubah role pengguna');
      console.error('Error updating user role:', error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <UserCheck className="h-4 w-4" />;
      case 'admin':
        return <Users className="h-4 w-4" />;
      default:
        return <UserX className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Manajemen Pengguna
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card/50"
            >
              <div className="flex items-center gap-3">
                {getRoleIcon(user.role)}
                <div>
                  <p className="font-medium">{user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Bergabung: {new Date(user.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role === 'super_admin' ? 'Super Admin' : 
                   user.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                
                <div className="flex gap-2">
                  {user.role !== 'admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateUserRole(user.id, 'admin')}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                    >
                      Jadikan Admin
                    </Button>
                  )}
                  
                  {user.role !== 'user' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateUserRole(user.id, 'user')}
                    >
                      Jadikan User
                    </Button>
                  )}
                  
                  {user.role !== 'super_admin' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateUserRole(user.id, 'super_admin')}
                      className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                    >
                      Jadikan Super Admin
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada pengguna ditemukan
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}