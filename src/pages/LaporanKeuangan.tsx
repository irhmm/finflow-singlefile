import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calculator } from "lucide-react";
import { AdminIncome, WorkerIncome, Expense } from "@/components/FinancialDashboard";

interface MonthlyData {
  totalAdminIncome: number;
  totalWorkerIncome: number;
  totalExpenses: number;
  totalRevenue: number;
}

const LaporanKeuangan = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({
    totalAdminIncome: 0,
    totalWorkerIncome: 0,
    totalExpenses: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Load admin income
      const { data: adminData, error: adminError } = await supabase
        .from("admin_income")
        .select("nominal");
      
      if (adminError) throw adminError;

      // Load worker income
      const { data: workerData, error: workerError } = await supabase
        .from("worker_income")
        .select("fee");
      
      if (workerError) throw workerError;

      // Load expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("nominal");
      
      if (expenseError) throw expenseError;

      // Calculate totals
      const totalAdminIncome = (adminData as AdminIncome[])?.reduce((sum, item) => 
        sum + (item.nominal || 0), 0) || 0;
      
      const totalWorkerIncome = (workerData as WorkerIncome[])?.reduce((sum, item) => 
        sum + (item.fee || 0), 0) || 0;
      
      const totalExpenses = (expenseData as Expense[])?.reduce((sum, item) => 
        sum + (item.nominal || 0), 0) || 0;

      const totalRevenue = totalAdminIncome + totalWorkerIncome - totalExpenses;

      setMonthlyData({
        totalAdminIncome,
        totalWorkerIncome,
        totalExpenses,
        totalRevenue
      });

    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data laporan...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-header-primary">
            Laporan Keuangan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ringkasan lengkap pendapatan, pengeluaran, dan omset finansial
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Admin Income */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-700">
                  Total Pendapatan Admin
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800 mb-2">
                {formatCurrency(monthlyData.totalAdminIncome)}
              </div>
              <p className="text-xs text-green-600">
                Akumulasi semua pendapatan admin
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-green-200/30 rounded-full"></div>
          </Card>

          {/* Total Worker Income */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Total Pendapatan Worker
                </CardTitle>
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800 mb-2">
                {formatCurrency(monthlyData.totalWorkerIncome)}
              </div>
              <p className="text-xs text-blue-600">
                Akumulasi semua pendapatan worker
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-blue-200/30 rounded-full"></div>
          </Card>

          {/* Total Expenses */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-red-700">
                  Total Pengeluaran
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-800 mb-2">
                {formatCurrency(monthlyData.totalExpenses)}
              </div>
              <p className="text-xs text-red-600">
                Akumulasi semua pengeluaran
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-red-200/30 rounded-full"></div>
          </Card>

          {/* Total Revenue/Omset */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-secondary/10 to-secondary/20 border-secondary/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-secondary">
                  Omset Bersih
                </CardTitle>
                <Calculator className="h-5 w-5 text-secondary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-header-primary mb-2">
                {formatCurrency(monthlyData.totalRevenue)}
              </div>
              <p className="text-xs text-secondary">
                Pendapatan - Pengeluaran
              </p>
            </CardContent>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 bg-secondary/10 rounded-full"></div>
          </Card>
        </div>

        {/* Summary Section */}
        <Card className="bg-gradient-to-r from-card to-secondary/5 border-secondary/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-header-primary text-center">
              Ringkasan Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">Total Pemasukan</h3>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(monthlyData.totalAdminIncome + monthlyData.totalWorkerIncome)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                <h3 className="font-semibold text-red-800 mb-2">Total Pengeluaran</h3>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(monthlyData.totalExpenses)}
                </p>
              </div>
              <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/20 rounded-lg border border-secondary/30">
                <h3 className="font-semibold text-secondary mb-2">Keuntungan Bersih</h3>
                <p className={`text-2xl font-bold ${monthlyData.totalRevenue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(monthlyData.totalRevenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LaporanKeuangan;