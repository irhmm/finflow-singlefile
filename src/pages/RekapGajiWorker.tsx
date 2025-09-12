import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingUp, Calculator } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface WorkerIncome {
  id: number;
  worker: string;
  code: string;
  jobdesk: string;
  fee: number;
  tanggal: string;
}

interface SalaryWithdrawal {
  id: number;
  worker: string;
  amount: number;
  tanggal: string;
  catatan?: string;
}

interface SummaryData {
  totalIncome: number;
  totalWithdrawals: number;
  remainingBalance: number;
}

export default function RekapGajiWorker() {
  const { user, userRole, loading } = useAuth();
  const [workers, setWorkers] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [workerIncomes, setWorkerIncomes] = useState<WorkerIncome[]>([]);
  const [salaryWithdrawals, setSalaryWithdrawals] = useState<SalaryWithdrawal[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalIncome: 0, totalWithdrawals: 0, remainingBalance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
  const [withdrawalCurrentPage, setWithdrawalCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Form state
  const [formData, setFormData] = useState({
    worker: "",
    amount: "",
    catatan: ""
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    if (selectedWorker && selectedMonth) {
      fetchData();
    }
  }, [selectedWorker, selectedMonth]);

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from("worker_income")
        .select("worker")
        .order("worker");

      if (error) throw error;

      const uniqueWorkers = Array.from(new Set(data?.map(item => item.worker) || []));
      setWorkers(uniqueWorkers);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast.error("Gagal mengambil data worker");
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch worker income for selected month and worker
      const startDate = `${selectedMonth}-01`;
      const endDate = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0), "yyyy-MM-dd");

      const { data: incomeData, error: incomeError } = await supabase
        .from("worker_income")
        .select("*")
        .eq("worker", selectedWorker)
        .gte("tanggal", startDate)
        .lte("tanggal", endDate)
        .order("tanggal", { ascending: false });

      if (incomeError) throw incomeError;

      // Fetch salary withdrawals for selected month and worker
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("salary_withdrawals")
        .select("*")
        .eq("worker", selectedWorker)
        .gte("tanggal", startDate)
        .lte("tanggal", endDate)
        .order("tanggal", { ascending: false });

      if (withdrawalError) throw withdrawalError;

      setWorkerIncomes(incomeData || []);
      setSalaryWithdrawals(withdrawalData || []);

      // Calculate summary
      const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.fee), 0) || 0;
      const totalWithdrawals = withdrawalData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
      const remainingBalance = totalIncome - totalWithdrawals;

      setSummary({ totalIncome, totalWithdrawals, remainingBalance });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.worker || !formData.amount) {
      toast.error("Worker dan jumlah harus diisi");
      return;
    }

    try {
      const { error } = await supabase
        .from("salary_withdrawals")
        .insert([
          {
            worker: formData.worker,
            amount: Number(formData.amount),
            catatan: formData.catatan || null
          }
        ]);

      if (error) throw error;

      toast.success("Pengambilan gaji berhasil ditambahkan!");
      setIsDialogOpen(false);
      setFormData({ worker: "", amount: "", catatan: "" });
      
      // Refresh data if the added withdrawal is for the currently selected worker
      if (formData.worker === selectedWorker) {
        fetchData();
      }
    } catch (error) {
      console.error("Error adding salary withdrawal:", error);
      toast.error("Gagal menambahkan pengambilan gaji");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy", { locale: id });
  };

  // Pagination logic for income data
  const incomeStartIndex = (incomeCurrentPage - 1) * itemsPerPage;
  const paginatedIncomes = workerIncomes.slice(incomeStartIndex, incomeStartIndex + itemsPerPage);
  const incomeTotalPages = Math.ceil(workerIncomes.length / itemsPerPage);

  // Pagination logic for withdrawal data
  const withdrawalStartIndex = (withdrawalCurrentPage - 1) * itemsPerPage;
  const paginatedWithdrawals = salaryWithdrawals.slice(withdrawalStartIndex, withdrawalStartIndex + itemsPerPage);
  const withdrawalTotalPages = Math.ceil(salaryWithdrawals.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Rekap Gaji Worker</h1>
          <p className="text-muted-foreground">Kelola pengambilan gaji dan pendapatan worker</p>
        </div>

        {/* Filter Section */}
        <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Filter Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="worker">Pilih Worker</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker} value={worker}>
                        {worker}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="month">Pilih Bulan</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Pengambilan Gaji
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Pengambilan Gaji</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="formWorker">Worker</Label>
                        <Select value={formData.worker} onValueChange={(value) => setFormData(prev => ({ ...prev, worker: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih worker..." />
                          </SelectTrigger>
                          <SelectContent>
                            {workers.map((worker) => (
                              <SelectItem key={worker} value={worker}>
                                {worker}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="amount">Jumlah</Label>
                        <Input
                          type="number"
                          placeholder="Masukkan jumlah..."
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="catatan">Catatan (opsional)</Label>
                        <Textarea
                          placeholder="Masukkan catatan..."
                          value={formData.catatan}
                          onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        Simpan
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {selectedWorker && selectedMonth && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Total Pendapatan</p>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalIncome)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Pengambilan</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalWithdrawals)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-r ${summary.remainingBalance >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${summary.remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Sisa Saldo</p>
                    <p className={`text-2xl font-bold ${summary.remainingBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(summary.remainingBalance)}</p>
                  </div>
                  <Calculator className={`h-8 w-8 ${summary.remainingBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tables Section */}
        {selectedWorker && selectedMonth && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Worker Income Table */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Rincian Pendapatan ({selectedWorker})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Jobdesk</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : paginatedIncomes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Tidak ada data pendapatan
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedIncomes.map((income) => (
                          <TableRow key={income.id}>
                            <TableCell>{formatDate(income.tanggal)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{income.code}</Badge>
                            </TableCell>
                            <TableCell>{income.jobdesk}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(income.fee)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Income Pagination */}
                {incomeTotalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIncomeCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={incomeCurrentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {incomeCurrentPage} of {incomeTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIncomeCurrentPage(prev => Math.min(prev + 1, incomeTotalPages))}
                      disabled={incomeCurrentPage === incomeTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Salary Withdrawals Table */}
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Rincian Pengambilan Gaji</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : paginatedWithdrawals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            Tidak ada data pengambilan gaji
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedWithdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>{formatDate(withdrawal.tanggal)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(withdrawal.amount)}</TableCell>
                            <TableCell>{withdrawal.catatan || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Withdrawal Pagination */}
                {withdrawalTotalPages > 1 && (
                  <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWithdrawalCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={withdrawalCurrentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {withdrawalCurrentPage} of {withdrawalTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWithdrawalCurrentPage(prev => Math.min(prev + 1, withdrawalTotalPages))}
                      disabled={withdrawalCurrentPage === withdrawalTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}