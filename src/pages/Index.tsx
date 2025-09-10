import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { PublicFinancialView } from "@/components/PublicFinancialView";
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  // Show public view for non-authenticated users
  if (!user) {
    return <PublicFinancialView onLoginClick={handleLoginClick} />;
  }

  // Show admin dashboard for authenticated users
  return <FinancialDashboard />;
};

export default Index;
