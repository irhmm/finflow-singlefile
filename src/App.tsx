import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LaporanKeuangan from "./pages/LaporanKeuangan";
import PublicWorkerIncome from "./pages/PublicWorkerIncome";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/" element={<Index />} />
          <Route path="/public/worker-income" element={<PublicWorkerIncome />} />
          
          {/* Admin login route */}
          <Route path="/admin" element={
            !user ? (
              <AuthForm onSuccess={() => window.location.href = '/dashboard'} />
            ) : (
              <AdminDashboard />
            )
          } />
          
          {/* Protected routes - require authentication */}
          {user && (
            <>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/pendapatan-admin" element={<AdminDashboard />} />
              <Route path="/pendapatan-worker" element={<AdminDashboard />} />
              <Route path="/pengeluaran" element={<AdminDashboard />} />
              <Route path="/laporan-keuangan" element={<LaporanKeuangan />} />
            </>
          )}
          
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
