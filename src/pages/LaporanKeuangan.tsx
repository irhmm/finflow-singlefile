import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface FinancialSummary {
  totalAdminIncome: number;
  totalWorkerIncome: number;
  totalExpenses: number;
  omset: number;
  previousAdminIncome: number;
  previousWorkerIncome: number;
  previousExpenses: number;
  previousOmset: number;
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
    omset: 0,
    previousAdminIncome: 0,
    previousWorkerIncome: 0,
    previousExpenses: 0,
    previousOmset: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const loadAvailableYears = async () => {
    try {
      // Optimized: Only fetch distinct years by getting min/max dates
      const currentYear = new Date().getFullYear();
      const minYear = 2020; // Reasonable minimum year
      
      // Check if data exists for recent years (last 5 years only)
      const yearsToCheck = [];
      for (let y = currentYear; y >= minYear; y--) {
        yearsToCheck.push(y.toString());
      }
      
      // Simple approach: just show last 5 years, data will be empty if no records
      const years = yearsToCheck.slice(0, 5);
      setAvailableYears(years.length > 0 ? years : [currentYear.toString()]);
    } catch (error) {
      console.error("Error loading years:", error);
      setAvailableYears([new Date().getFullYear().toString()]);
    }
  };

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Load data for selected year and previous month
      const currentYear = parseInt(selectedYear);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // 1-12
      
      // Calculate previous month
      let previousMonth, previousYear;
      if (currentMonth === 1) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      } else {
        previousMonth = currentMonth - 1;
        previousYear = currentYear;
      }
      
      const [adminResult, workerResult, expensesResult, prevAdminResult, prevWorkerResult, prevExpensesResult] = await Promise.all([
        supabase.from("admin_income").select("nominal, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`),
        supabase.from("worker_income").select("fee, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`),
        supabase.from("expenses").select("nominal, tanggal").gte("tanggal", `${selectedYear}-01-01`).lte("tanggal", `${selectedYear}-12-31`),
        supabase.from("admin_income").select("nominal, tanggal").gte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`).lte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-31`),
        supabase.from("worker_income").select("fee, tanggal").gte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`).lte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-31`),
        supabase.from("expenses").select("nominal, tanggal").gte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`).lte("tanggal", `${previousYear}-${previousMonth.toString().padStart(2, '0')}-31`)
      ]);

      if (adminResult.error) throw adminResult.error;
      if (workerResult.error) throw workerResult.error;
      if (expensesResult.error) throw expensesResult.error;

      // Calculate current month totals (from this month of current year)
      const currentMonthData = {
        admin: adminResult.data?.filter(record => new Date(record.tanggal).getMonth() === currentMonth - 1) || [],
        worker: workerResult.data?.filter(record => new Date(record.tanggal).getMonth() === currentMonth - 1) || [],
        expenses: expensesResult.data?.filter(record => new Date(record.tanggal).getMonth() === currentMonth - 1) || []
      };

      const totalAdminIncome = currentMonthData.admin.reduce((total, record) => total + (record.nominal || 0), 0);
      const totalWorkerIncome = currentMonthData.worker.reduce((total, record) => total + (record.fee || 0), 0);
      const totalExpenses = currentMonthData.expenses.reduce((total, record) => total + (record.nominal || 0), 0);
      const omset = totalAdminIncome + totalWorkerIncome - totalExpenses;

      // Calculate previous month totals
      const previousAdminIncome = prevAdminResult.data?.reduce((total, record) => total + (record.nominal || 0), 0) || 0;
      const previousWorkerIncome = prevWorkerResult.data?.reduce((total, record) => total + (record.fee || 0), 0) || 0;
      const previousExpenses = prevExpensesResult.data?.reduce((total, record) => total + (record.nominal || 0), 0) || 0;
      const previousOmset = previousAdminIncome + previousWorkerIncome - previousExpenses;

      setSummary({
        totalAdminIncome,
        totalWorkerIncome,
        totalExpenses,
        omset,
        previousAdminIncome,
        previousWorkerIncome,
        previousExpenses,
        previousOmset
      });

      // Calculate monthly breakdown for chart and table
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

      // Always show all 12 months (don't filter out months with no data)
      setMonthlyData(Object.values(monthlyBreakdown));
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

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const summaryCards = [
    {
      title: "Total Pendapatan Worker",
      value: summary.totalWorkerIncome,
      previousValue: summary.previousWorkerIncome,
      icon: TrendingUp,
      bgColor: "bg-white dark:bg-gray-800",
      textColor: "text-gray-900 dark:text-gray-100"
    },
    {
      title: "Total Pendapatan Admin",
      value: summary.totalAdminIncome,
      previousValue: summary.previousAdminIncome,
      icon: TrendingUp,
      bgColor: "bg-white dark:bg-gray-800",
      textColor: "text-gray-900 dark:text-gray-100"
    },
    {
      title: "Total Pengeluaran",
      value: summary.totalExpenses,
      previousValue: summary.previousExpenses,
      icon: TrendingDown,
      bgColor: "bg-white dark:bg-gray-800",
      textColor: "text-gray-900 dark:text-gray-100"
    },
    {
      title: "Total Omset Bulanan",
      value: summary.omset,
      previousValue: summary.previousOmset,
      icon: DollarSign,
      bgColor: "bg-white dark:bg-gray-800",
      textColor: "text-gray-900 dark:text-gray-100"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {summaryCards.map((card, index) => {
                const Icon = card.icon;
                const percentageChange = calculatePercentageChange(card.value, card.previousValue);
                const isPositive = percentageChange >= 0;
                const changeColor = isPositive ? "text-green-600" : "text-red-600";
                const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
                
                return (
                  <Card key={index} className={`${card.bgColor} border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <Icon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                        <div className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
                          <ChangeIcon className="h-4 w-4" />
                          {Math.abs(percentageChange).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          {card.title}
                        </p>
                        <div className={`text-2xl font-bold ${card.textColor} ${loading ? 'animate-pulse' : ''}`}>
                          {loading ? "..." : formatCurrency(card.value)}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {isPositive ? "+" : ""}{percentageChange.toFixed(1)}% vs bulan lalu
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Monthly Chart */}
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      Grafik Bulanan
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total data per bulan {selectedYear}
                    </p>
                  </div>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-28 h-9 bg-blue-50 border-blue-200 text-blue-700 font-medium">
                      <SelectValue />
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
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      workerIncome: {
                        label: "Pendapatan Worker",
                        color: "hsl(262, 83%, 58%)",
                      },
                      adminIncome: {
                        label: "Pendapatan Admin", 
                        color: "hsl(142, 76%, 36%)",
                      },
                      expenses: {
                        label: "Pengeluaran",
                        color: "hsl(0, 84%, 60%)",
                      },
                      omset: {
                        label: "Omset",
                        color: "hsl(221, 83%, 53%)",
                      },
                    }}
                    className="h-[400px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData.map(data => ({
                          month: data.month.slice(0, 3),
                          workerIncome: data.workerIncome,
                          adminIncome: data.adminIncome,
                          expenses: data.expenses,
                          omset: data.saldoBersih,
                        }))}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 40,
                          bottom: 5,
                        }}
                        maxBarSize={35}
                        barCategoryGap="15%"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                        <XAxis 
                          dataKey="month" 
                          className="text-xs"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis 
                          className="text-xs"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                            if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                          }}
                        />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const workerIncome = payload.find(p => p.dataKey === 'workerIncome')?.value as number || 0;
                              const adminIncome = payload.find(p => p.dataKey === 'adminIncome')?.value as number || 0;
                              const expenses = payload.find(p => p.dataKey === 'expenses')?.value as number || 0;
                              const omset = payload.find(p => p.dataKey === 'omset')?.value as number || 0;
                              
                              const monthNames: { [key: string]: string } = {
                                'Jan': 'Januari', 'Feb': 'Februari', 'Mar': 'Maret',
                                'Apr': 'April', 'Mei': 'Mei', 'Jun': 'Juni',
                                'Jul': 'Juli', 'Agu': 'Agustus', 'Sep': 'September',
                                'Okt': 'Oktober', 'Nov': 'November', 'Des': 'Desember'
                              };
                              const fullMonth = monthNames[label] || label;
                              
                              return (
                                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 min-w-[220px]">
                                  <p className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-base">
                                    {fullMonth} {selectedYear}
                                  </p>
                                  <div className="space-y-2.5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Pendapatan Worker:</span>
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-auto">
                                        {formatCurrency(workerIncome)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Pendapatan Admin:</span>
                                      <span className="font-semibold text-blue-600 dark:text-blue-400 ml-auto">
                                        {formatCurrency(adminIncome)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Pengeluaran:</span>
                                      <span className="font-semibold text-red-600 dark:text-red-400 ml-auto">
                                        {formatCurrency(expenses)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">Omset:</span>
                                      <span className="font-semibold text-purple-600 dark:text-purple-400 ml-auto">
                                        {formatCurrency(omset)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ChartLegend 
                          content={<ChartLegendContent />} 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Bar 
                          dataKey="workerIncome" 
                          fill="hsl(262, 83%, 58%)"
                          radius={[3, 3, 0, 0]}
                          name="Pendapatan Worker"
                        />
                        <Bar 
                          dataKey="adminIncome" 
                          fill="hsl(142, 76%, 36%)"
                          radius={[3, 3, 0, 0]}
                          name="Pendapatan Admin"
                        />
                        <Bar 
                          dataKey="expenses" 
                          fill="hsl(0, 84%, 60%)"
                          radius={[3, 3, 0, 0]}
                          name="Pengeluaran"
                        />
                        <Bar 
                          dataKey="omset" 
                          fill="hsl(221, 83%, 53%)"
                          radius={[3, 3, 0, 0]}
                          name="Omset"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

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
                      {monthlyData.filter(data => 
                        data.adminIncome > 0 || data.workerIncome > 0 || data.expenses > 0
                      ).length > 0 ? (
                        monthlyData.filter(data => 
                          data.adminIncome > 0 || data.workerIncome > 0 || data.expenses > 0
                        ).map((data, index) => (
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