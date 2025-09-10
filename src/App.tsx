import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LaporanKeuangan from "./pages/LaporanKeuangan";
import AdminLogin from "./pages/AdminLogin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <AuthForm onSuccess={() => window.location.reload()} />;
  }
  
  return <>{children}</>;
}

const queryClient = new QueryClient();

function AppContent() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/pendapatan-worker" element={<Index />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          
          {/* Protected routes for admin */}
          <Route path="/pendapatan-admin" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/pengeluaran" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/laporan-keuangan" element={
            <ProtectedRoute>
              <LaporanKeuangan />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
