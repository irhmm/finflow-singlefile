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
import { Plus, Wallet, TrendingUp, Calculator, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

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
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [workerIncomes, setWorkerIncomes] = useState<WorkerIncome[]>([]);
  const [salaryWithdrawals, setSalaryWithdrawals] = useState<SalaryWithdrawal[]>([]);
  const [summary, setSummary] = useState<SummaryData>({ totalIncome: 0, totalWithdrawals: 0, remainingBalance: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [incomeCurrentPage, setIncomeCurrentPage] = useState(1);
  const [withdrawalCurrentPage, setWithdrawalCurrentPage] = useState(1);
  const [workerComboboxOpen, setWorkerComboboxOpen] = useState(false);
  const [monthComboboxOpen, setMonthComboboxOpen] = useState(false);
  const itemsPerPage = 15;
  const canWrite = ['admin', 'admin_keuangan', 'super_admin'].includes(userRole);

  // Form state
  const [formData, setFormData] = useState({
    worker: "",
    amount: "",
    catatan: ""
  });

  useEffect(() => {
    fetchWorkers();
    fetchAvailableMonths();
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

  const fetchAvailableMonths = async () => {
    try {
      // Get months from worker_income
      const { data: incomeData, error: incomeError } = await supabase
        .from("worker_income")
        .select("tanggal")
        .order("tanggal", { ascending: false });

      if (incomeError) throw incomeError;

      // Get months from salary_withdrawals
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("salary_withdrawals")
        .select("tanggal")
        .order("tanggal", { ascending: false });

      if (withdrawalError) throw withdrawalError;

      // Combine and extract unique months
      const allDates = [
        ...(incomeData?.map(item => item.tanggal) || []),
        ...(withdrawalData?.map(item => format(new Date(item.tanggal), "yyyy-MM-dd")) || [])
      ];

      const uniqueMonths = Array.from(new Set(
        allDates.map(date => format(new Date(date), "yyyy-MM"))
      )).sort().reverse();

      setAvailableMonths(uniqueMonths);
    } catch (error) {
      console.error("Error fetching available months:", error);
      toast.error("Gagal mengambil data bulan tersedia");
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeTable="rekap_gaji" onTableChange={() => {}} />
        
        <main className="flex-1">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-4">
            <SidebarTrigger className="mr-2 md:mr-4" />
            <div className="flex-1 text-center">
              <h1 className="text-base md:text-lg font-semibold">Rekap Gaji Worker</h1>
            </div>
          </header>

          <div className="bg-gradient-to-br from-background to-secondary/10 p-3 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary">Rekap Gaji Worker</h1>
                <p className="text-sm md:text-base text-muted-foreground">Kelola pengambilan gaji dan pendapatan worker</p>
              </div>

              {/* ... keep existing code (filter section and rest of component) */}
              
              {/* Filter Section */}
              <Card className="bg-card/80 backdrop-blur-sm border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Filter Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="worker">Pilih Worker</Label>
                      <Popover open={workerComboboxOpen} onOpenChange={setWorkerComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={workerComboboxOpen}
                            className="w-full justify-between text-left"
                          >
                            <span className="truncate">{selectedWorker || "Pilih worker..."}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Cari worker..." />
                            <CommandList>
                              <CommandEmpty>Tidak ada worker ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {workers.map((worker) => (
                                  <CommandItem
                                    key={worker}
                                    value={worker}
                                    onSelect={(currentValue) => {
                                      setSelectedWorker(currentValue === selectedWorker ? "" : currentValue);
                                      setWorkerComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedWorker === worker ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {worker}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="month">Pilih Bulan</Label>
                      <Popover open={monthComboboxOpen} onOpenChange={setMonthComboboxOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={monthComboboxOpen}
                            className="w-full justify-between text-left"
                          >
                            <span className="truncate">{selectedMonth ? format(new Date(selectedMonth), "MMMM yyyy", { locale: id }) : "Pilih bulan..."}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Cari bulan..." />
                            <CommandList>
                              <CommandEmpty>Tidak ada bulan ditemukan.</CommandEmpty>
                              <CommandGroup>
                                {availableMonths.map((month) => (
                                  <CommandItem
                                    key={month}
                                    value={month}
                                    onSelect={(currentValue) => {
                                      setSelectedMonth(currentValue === selectedMonth ? "" : currentValue);
                                      setMonthComboboxOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedMonth === month ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {format(new Date(month), "MMMM yyyy", { locale: id })}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {canWrite && (
                      <div className="flex items-end">
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full bg-primary hover:bg-primary/90">
                              <Plus className="h-4 w-4 mr-2" />
                              <span className="hidden sm:inline">Tambah Pengambilan Gaji</span>
                              <span className="sm:hidden">Tambah Gaji</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Tambah Pengambilan Gaji</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="formWorker">Worker</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline" 
                                      role="combobox"
                                      className="w-full justify-between"
                                    >
                                      {formData.worker || "Pilih worker..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Cari worker..." />
                                      <CommandList>
                                        <CommandEmpty>Tidak ada worker ditemukan.</CommandEmpty>
                                        <CommandGroup>
                                          {workers.map((worker) => (
                                            <CommandItem
                                              key={worker}
                                              value={worker}
                                              onSelect={(currentValue) => {
                                                setFormData(prev => ({ ...prev, worker: currentValue }));
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  formData.worker === worker ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {worker}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
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
                    )}
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
        </main>
      </div>
    </SidebarProvider>
  );
}