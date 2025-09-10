import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FinancialSummary {
  totalAdminIncome: number;
  totalWorkerIncome: number;
  totalExpenses: number;
  omset: number;
}

interface MonthlyData {
  month: string;
  adminIncome: number;
  workerIncome: number;
  expenses: number;
  saldoBersih: number;
}

export default function LaporanKeuangan() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [summary, setSummary] = useState<FinancialSummary>({
    totalAdminIncome: 0,
    totalWorkerIncome: 0,
    totalExpenses: 0,
    omset: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const loadAvailableYears = async () => {
    try {
      const queries = await Promise.all([
        supabase.from("admin_income").select("tanggal"),
        supabase.from("worker_income").select("tanggal"),
        supabase.from("expenses").select("tanggal")
      ]);

      const allDates: string[] = [];
      queries.forEach(({ data }) => {
        if (data) {
          allDates.push(...data.map(record => record.tanggal));
        }
      });

      const years = [...new Set(allDates.map(date => new Date(date).getFullYear().toString()))];
      years.sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(years.length > 0 ? years : [new Date().getFullYear().toString()]);
    } catch (error) {
      console.error("Error loading years:", error);
      setAvailableYears([new Date().getFullYear().toString()]);
    }
  };

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Load data for selected year
      const yearFilter = `${selectedYear}-01-01,${selectedYear}-12-31`;
      
      const [adminResult, workerResult, expensesResult] = await Promise.all([
        supabase.from("admin_income").select("nominal, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`),
        supabase.from("worker_income").select("fee, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`),
        supabase.from("expenses").select("nominal, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`)
      ]);

      if (adminResult.error) throw adminResult.error;
      if (workerResult.error) throw workerResult.error;
      if (expensesResult.error) throw expensesResult.error;

      // Calculate yearly totals
      const totalAdminIncome = adminResult.data?.reduce((total, record) => total + (record.nominal || 0), 0) || 0;
      const totalWorkerIncome = workerResult.data?.reduce((total, record) => total + (record.fee || 0), 0) || 0;
      const totalExpenses = expensesResult.data?.reduce((total, record) => total + (record.nominal || 0), 0) || 0;
      const omset = totalAdminIncome + totalWorkerIncome - totalExpenses;

      setSummary({
        totalAdminIncome,
        totalWorkerIncome,
        totalExpenses,
        omset
      });

      // Calculate monthly breakdown
      const monthlyBreakdown: { [key: string]: MonthlyData } = {};
      
      // Initialize all months
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      months.forEach((month, index) => {
        monthlyBreakdown[month] = {
          month,
          adminIncome: 0,
          workerIncome: 0,
          expenses: 0,
          saldoBersih: 0
        };
      });

      // Add admin income
      adminResult.data?.forEach(record => {
        const month = months[new Date(record.tanggal).getMonth()];
        monthlyBreakdown[month].adminIncome += record.nominal || 0;
      });

      // Add worker income
      workerResult.data?.forEach(record => {
        const month = months[new Date(record.tanggal).getMonth()];
        monthlyBreakdown[month].workerIncome += record.fee || 0;
      });

      // Add expenses
      expensesResult.data?.forEach(record => {
        const month = months[new Date(record.tanggal).getMonth()];
        monthlyBreakdown[month].expenses += record.nominal || 0;
      });

      // Calculate saldo bersih for each month
      Object.values(monthlyBreakdown).forEach(data => {
        data.saldoBersih = data.adminIncome + data.workerIncome - data.expenses;
      });

      // Filter out months with no data
      const filteredMonthly = Object.values(monthlyBreakdown).filter(data => 
        data.adminIncome > 0 || data.workerIncome > 0 || data.expenses > 0
      );

      setMonthlyData(filteredMonthly);
    } catch (error) {
      console.error("Error loading financial data:", error);
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
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadFinancialData();
    }
  }, [selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const summaryCards = [
    {
      title: "Total Pendapatan",
      value: summary.totalAdminIncome + summary.totalWorkerIncome,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      textColor: "text-green-600"
    },
    {
      title: "Total Pengeluaran",
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: "text-red-600", 
      bgColor: "bg-red-50 dark:bg-red-950",
      textColor: "text-red-600"
    },
    {
      title: "Saldo Bersih",
      value: summary.omset,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      textColor: "text-blue-600"
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
              <div className="flex items-center gap-4">
                <Calendar className="h-8 w-8 text-secondary" />
                <h1 className="text-4xl font-bold text-header">
                  Rekap Bulanan
                </h1>
              </div>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {summaryCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <Card key={index} className={`${card.bgColor} border-0 shadow-elegant hover:shadow-lg transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            {card.title}
                          </p>
                          <div className={`text-3xl font-bold ${card.textColor} ${loading ? 'animate-pulse' : ''}`}>
                            {loading ? "..." : formatCurrency(card.value)}
                          </div>
                        </div>
                        <Icon className={`h-8 w-8 ${card.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Monthly Breakdown Table */}
            <Card className="bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-header">
                  Rincian Per Bulan - {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold text-header">Bulan</TableHead>
                        <TableHead className="font-bold text-header text-right">Pendapatan Admin</TableHead>
                        <TableHead className="font-bold text-header text-right">Pendapatan Worker</TableHead>
                        <TableHead className="font-bold text-header text-right">Pengeluaran</TableHead>
                        <TableHead className="font-bold text-header text-right">Saldo Bersih</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.length > 0 ? (
                        monthlyData.map((data, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{data.month}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(data.adminIncome)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(data.workerIncome)}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(data.expenses)}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${data.saldoBersih >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(data.saldoBersih)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Tidak ada data untuk tahun {selectedYear}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}