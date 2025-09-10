import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Login berhasil! Selamat datang, Admin.');
      
      // Redirect to admin dashboard
      navigate('/pendapatan-admin');
    } catch (error) {
      toast.error('Terjadi kesalahan yang tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/5 p-4">
      <div className="absolute top-6 left-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </Button>
      </div>
      
      <Card className="w-full max-w-md shadow-elegant border-secondary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-secondary" />
          </div>
          <CardTitle className="text-3xl font-bold text-header">
            Login Admin
          </CardTitle>
          <CardDescription className="text-base">
            Masukkan kredensial admin untuk mengakses sistem manajemen keuangan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Admin
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@sistem-keuangan.com"
                className="h-12 bg-background/80 border-secondary/30 focus:border-secondary focus:ring-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="h-12 bg-background/80 border-secondary/30 focus:border-secondary focus:ring-secondary/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white font-medium shadow-elegant" 
              disabled={loading}
            >
              {loading ? 'Memverifikasi...' : 'Login sebagai Admin'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-secondary/10">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Akses Terbatas:</strong> Halaman ini hanya untuk administrator sistem keuangan
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}