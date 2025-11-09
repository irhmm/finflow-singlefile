import { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LaporanKeuangan from "./pages/LaporanKeuangan";
import RekapGajiWorker from "./pages/RekapGajiWorker";
import WorkerDone from "./pages/WorkerDone";

const queryClient = new QueryClient();

function AppContent() {
  const { loading } = useAuth();

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
          <Route path="/admin-login" element={<AuthForm onSuccess={() => window.location.href = "/"} />} />
          <Route path="/" element={<Index />} />
          <Route path="/pendapatan-admin" element={
            <ProtectedRoute requireAdmin={true}>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/pendapatan-worker" element={<Index />} />
          <Route path="/pengeluaran" element={
            <ProtectedRoute requireAdmin={true}>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/laporan-keuangan" element={
            <ProtectedRoute requireAdmin={true}>
              <LaporanKeuangan />
            </ProtectedRoute>
          } />
          <Route path="/rekap-gaji-worker" element={<RekapGajiWorker />} />
          <Route path="/worker-done" element={
            <ProtectedRoute requireAdmin={true}>
              <WorkerDone />
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
    <Toaster />
    <Sonner />
    <AppContent />
  </QueryClientProvider>
);

export default App;
