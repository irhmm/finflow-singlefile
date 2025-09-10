import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MonthlyData {
  month: string;
  year: number;
  admin_income: number;
  worker_income: number;
  expenses: number;
  net_income: number;
}

export const MonthlyRecap = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      // Get all data for the selected year
      const [adminResult, workerResult, expensesResult] = await Promise.all([
        supabase
          .from("admin_income")
          .select("tanggal, nominal")
          .gte("tanggal", `${selectedYear}-01-01`)
          .lte("tanggal", `${selectedYear}-12-31`),
        supabase
          .from("worker_income")
          .select("tanggal, fee")
          .gte("tanggal", `${selectedYear}-01-01`)
          .lte("tanggal", `${selectedYear}-12-31`),
        supabase
          .from("expenses")
          .select("tanggal, nominal")
          .gte("tanggal", `${selectedYear}-01-01`)
          .lte("tanggal", `${selectedYear}-12-31`)
      ]);

      if (adminResult.error || workerResult.error || expensesResult.error) {
        throw new Error("Error loading data");
      }

      // Group data by month
      const monthlyMap = new Map<string, MonthlyData>();
      
      // Initialize all months
      for (let month = 1; month <= 12; month++) {
        const monthKey = `${selectedYear}-${month.toString().padStart(2, '0')}`;
        monthlyMap.set(monthKey, {
          month: new Date(selectedYear, month - 1).toLocaleString('id-ID', { month: 'long' }),
          year: selectedYear,
          admin_income: 0,
          worker_income: 0,
          expenses: 0,
          net_income: 0
        });
      }

      // Process admin income
      adminResult.data?.forEach(item => {
        const monthKey = item.tanggal.substring(0, 7);
        const existing = monthlyMap.get(monthKey);
        if (existing) {
          existing.admin_income += Number(item.nominal);
        }
      });

      // Process worker income
      workerResult.data?.forEach(item => {
        const monthKey = item.tanggal.substring(0, 7);
        const existing = monthlyMap.get(monthKey);
        if (existing) {
          existing.worker_income += Number(item.fee);
        }
      });

      // Process expenses
      expensesResult.data?.forEach(item => {
        const monthKey = item.tanggal.substring(0, 7);
        const existing = monthlyMap.get(monthKey);
        if (existing) {
          existing.expenses += Number(item.nominal);
        }
      });

      // Calculate net income and set data
      const data = Array.from(monthlyMap.values()).map(item => ({
        ...item,
        net_income: item.admin_income + item.worker_income - item.expenses
      }));

      setMonthlyData(data);
    } catch (error) {
      console.error("Error loading monthly data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data bulanan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableYears = async () => {
    try {
      const [adminResult, workerResult, expensesResult] = await Promise.all([
        supabase.from("admin_income").select("tanggal").order("tanggal"),
        supabase.from("worker_income").select("tanggal").order("tanggal"),
        supabase.from("expenses").select("tanggal").order("tanggal")
      ]);

      const allDates = [
        ...(adminResult.data || []).map(item => item.tanggal),
        ...(workerResult.data || []).map(item => item.tanggal),
        ...(expensesResult.data || []).map(item => item.tanggal)
      ];

      const years = Array.from(new Set(allDates.map(date => new Date(date).getFullYear())))
        .sort((a, b) => b - a);
      
      setAvailableYears(years);
    } catch (error) {
      console.error("Error loading years:", error);
    }
  };

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadMonthlyData();
    }
  }, [selectedYear]);

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const totalIncome = monthlyData.reduce((sum, month) => sum + month.admin_income + month.worker_income, 0);
  const totalExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0);
  const totalNet = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-secondary" />
          <h2 className="text-2xl font-bold">Rekap Bulanan</h2>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Total Pendapatan</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalIncome)}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Total Pengeluaran</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${totalNet >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${totalNet >= 0 ? 'text-blue-800' : 'text-red-800'}`}>Saldo Bersih</CardTitle>
            <DollarSign className={`h-4 w-4 ${totalNet >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(totalNet)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Per Bulan - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Memuat data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Bulan</th>
                    <th className="text-right py-3 px-4 font-medium">Pendapatan Admin</th>
                    <th className="text-right py-3 px-4 font-medium">Pendapatan Worker</th>
                    <th className="text-right py-3 px-4 font-medium">Pengeluaran</th>
                    <th className="text-right py-3 px-4 font-medium">Saldo Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{month.month}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(month.admin_income)}</td>
                      <td className="py-3 px-4 text-right text-green-600">{formatCurrency(month.worker_income)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(month.expenses)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${month.net_income >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(month.net_income)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};