import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const setupSuperadmin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/setup-superadmin', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Berhasil",
          description: "Superadmin user telah dibuat"
        });
        setDone(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-secondary/20">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
            Setup Sistem
          </CardTitle>
          <CardDescription>
            Setup pengguna superadmin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!done ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Klik tombol di bawah untuk membuat user superadmin dengan kredensial:
              </p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <div><strong>Username:</strong> irham</div>
                <div><strong>Password:</strong> Percobaan111</div>
              </div>
              <Button 
                onClick={setupSuperadmin}
                className="w-full bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  'Buat Superadmin'
                )}
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-green-600 font-semibold">
                ✓ Setup berhasil!
              </div>
              <p className="text-sm text-muted-foreground">
                Superadmin telah dibuat. Anda dapat login dengan kredensial yang telah disediakan.
              </p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90"
              >
                Menuju Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}