import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FinancialSummary {
  totalAdminIncome: number;
  totalWorkerIncome: number;
  totalExpenses: number;
  omset: number;
}

export default function LaporanKeuangan() {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalAdminIncome: 0,
    totalWorkerIncome: 0,
    totalExpenses: 0,
    omset: 0
  });
  const [loading, setLoading] = useState(true);

  const loadFinancialSummary = async () => {
    setLoading(true);
    try {
      // Load admin income
      const { data: adminIncome, error: adminError } = await supabase
        .from("admin_income")
        .select("nominal");
      
      // Load worker income
      const { data: workerIncome, error: workerError } = await supabase
        .from("worker_income")
        .select("fee");
      
      // Load expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("nominal");

      if (adminError) throw adminError;
      if (workerError) throw workerError;  
      if (expensesError) throw expensesError;

      const totalAdminIncome = adminIncome?.reduce((total, record) => 
        total + (record.nominal || 0), 0) || 0;
      
      const totalWorkerIncome = workerIncome?.reduce((total, record) => 
        total + (record.fee || 0), 0) || 0;
      
      const totalExpenses = expenses?.reduce((total, record) => 
        total + (record.nominal || 0), 0) || 0;

      const omset = totalAdminIncome + totalWorkerIncome - totalExpenses;

      setSummary({
        totalAdminIncome,
        totalWorkerIncome,
        totalExpenses,
        omset
      });
    } catch (error) {
      console.error("Error loading financial summary:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data laporan keuangan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialSummary();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const summaryCards = [
    {
      title: "Total Pendapatan Admin",
      value: summary.totalAdminIncome,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950"
    },
    {
      title: "Total Pendapatan Worker", 
      value: summary.totalWorkerIncome,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950"
    },
    {
      title: "Total Pengeluaran",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600", 
      bgColor: "bg-red-50 dark:bg-red-950"
    },
    {
      title: "Omset",
      value: summary.omset,
      icon: BarChart3,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950"
    }
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTable="laporan" onTableChange={() => {}} />
        
        <main className="flex-1 p-6 bg-gradient-to-br from-background via-background to-secondary/5">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-4xl font-bold text-header">
                Laporan Keuangan
              </h1>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {summaryCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <Card key={index} className={`${card.bgColor} border-0 shadow-elegant hover:shadow-lg transition-all duration-300`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </CardTitle>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold text-header ${loading ? 'animate-pulse' : ''}`}>
                        {loading ? "..." : formatCurrency(card.value)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-header flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-secondary" />
                  Ringkasan Keuangan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-sm text-muted-foreground">Total Pemasukan</p>
                    <p className="text-xl font-bold text-header">
                      {formatCurrency(summary.totalAdminIncome + summary.totalWorkerIncome)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                    <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                    <p className="text-xl font-bold text-header">
                      {formatCurrency(summary.totalExpenses)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
                    <p className="text-sm text-muted-foreground">Keuntungan Bersih</p>
                    <p className={`text-xl font-bold ${summary.omset >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.omset)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}