import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, Check, ChevronsUpDown, TrendingUp, ClipboardList, Calculator, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  const [workerComboboxOpen, setWorkerComboboxOpen] = useState(false);
  const [monthComboboxOpen, setMonthComboboxOpen] = useState(false);
  const canWrite = ['admin', 'admin_keuangan', 'super_admin'].includes(userRole);

  // Pagination state
  const [incomePage, setIncomePage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [incomeTotalCount, setIncomeTotalCount] = useState(0);
  const [withdrawalTotalCount, setWithdrawalTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Form state
  const [formData, setFormData] = useState({
    worker: "",
    amount: "",
    catatan: ""
  });
  
  // Balance validation state for form
  const [selectedWorkerBalance, setSelectedWorkerBalance] = useState<number | null>(null);
  const [isCalculatingBalance, setIsCalculatingBalance] = useState(false);

  // Helper function to normalize worker names
  const normalizeWorkerName = (name: string): string => {
    if (!name || !name.trim()) return '(Unknown)';
    const trimmed = name.trim();
    return trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  useEffect(() => {
    fetchWorkers();
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    if (selectedWorker || selectedMonth) {
      setIncomePage(1);
      setWithdrawalPage(1);
      fetchData();
    }
  }, [selectedWorker, selectedMonth]);

  // Refetch when pagination changes
  useEffect(() => {
    if (selectedWorker || selectedMonth) {
      fetchData();
    }
  }, [incomePage, withdrawalPage]);

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
      const { data: incomeData, error: incomeError } = await supabase
        .from("worker_income")
        .select("tanggal")
        .order("tanggal", { ascending: false });

      if (incomeError) throw incomeError;

      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("salary_withdrawals")
        .select("tanggal")
        .order("tanggal", { ascending: false });

      if (withdrawalError) throw withdrawalError;

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
    if (!selectedWorker && !selectedMonth) {
      setWorkerIncomes([]);
      setSalaryWithdrawals([]);
      setSummary({ totalIncome: 0, totalWithdrawals: 0, remainingBalance: 0 });
      setIncomeTotalCount(0);
      setWithdrawalTotalCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const startDate = selectedMonth ? `${selectedMonth}-01` : undefined;
      const endDate = selectedMonth 
        ? format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0), "yyyy-MM-dd") 
        : undefined;
      
      const incomeStart = (incomePage - 1) * itemsPerPage;
      const withdrawalStart = (withdrawalPage - 1) * itemsPerPage;

      // Build queries with server-side pagination
      let incomeQuery = supabase.from("worker_income").select("*", { count: 'exact' });
      let withdrawalQuery = supabase.from("salary_withdrawals").select("*", { count: 'exact' });
      
      // Separate queries for summary (need all data for totals)
      let incomeSummaryQuery = supabase.from("worker_income").select("fee, worker");
      let withdrawalSummaryQuery = supabase.from("salary_withdrawals").select("amount, worker");

      if (startDate && endDate) {
        incomeQuery = incomeQuery.gte("tanggal", startDate).lte("tanggal", endDate);
        withdrawalQuery = withdrawalQuery.gte("tanggal", startDate).lte("tanggal", endDate);
        incomeSummaryQuery = incomeSummaryQuery.gte("tanggal", startDate).lte("tanggal", endDate);
        withdrawalSummaryQuery = withdrawalSummaryQuery.gte("tanggal", startDate).lte("tanggal", endDate);
      }

      if (selectedWorker) {
        const normalizedWorker = normalizeWorkerName(selectedWorker);
        incomeQuery = incomeQuery.ilike("worker", normalizedWorker);
        withdrawalQuery = withdrawalQuery.ilike("worker", normalizedWorker);
        incomeSummaryQuery = incomeSummaryQuery.ilike("worker", normalizedWorker);
        withdrawalSummaryQuery = withdrawalSummaryQuery.ilike("worker", normalizedWorker);
      }

      // Fetch paginated data and summary in parallel
      const [incomeRes, withdrawalRes, incomeSummaryRes, withdrawalSummaryRes] = await Promise.all([
        incomeQuery.order("tanggal", { ascending: false }).range(incomeStart, incomeStart + itemsPerPage - 1),
        withdrawalQuery.order("tanggal", { ascending: false }).range(withdrawalStart, withdrawalStart + itemsPerPage - 1),
        incomeSummaryQuery,
        withdrawalSummaryQuery
      ]);

      if (incomeRes.error) throw new Error(`Gagal mengambil data pendapatan: ${incomeRes.error.message}`);
      if (withdrawalRes.error) throw new Error(`Gagal mengambil data pengambilan gaji: ${withdrawalRes.error.message}`);

      const normalizedIncome = (incomeRes.data || []).map(item => ({
        ...item,
        worker: normalizeWorkerName(item.worker)
      }));

      const normalizedWithdrawals = (withdrawalRes.data || []).map(item => ({
        ...item,
        worker: normalizeWorkerName(item.worker)
      }));

      setWorkerIncomes(normalizedIncome);
      setSalaryWithdrawals(normalizedWithdrawals);
      setIncomeTotalCount(incomeRes.count || 0);
      setWithdrawalTotalCount(withdrawalRes.count || 0);

      // Calculate totals from summary queries
      const totalIncome = (incomeSummaryRes.data || []).reduce((sum, item) => {
        const fee = Number(item.fee);
        return sum + (isNaN(fee) ? 0 : fee);
      }, 0);
      
      const totalWithdrawals = (withdrawalSummaryRes.data || []).reduce((sum, item) => {
        const amount = Number(item.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      const remainingBalance = totalIncome - totalWithdrawals;

      setSummary({ totalIncome, totalWithdrawals, remainingBalance });
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(error?.message || "Gagal mengambil data");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWorkerBalance = async (workerName: string) => {
    if (!workerName || !selectedMonth) {
      setSelectedWorkerBalance(null);
      return;
    }
    
    setIsCalculatingBalance(true);
    try {
      const normalizedWorker = normalizeWorkerName(workerName);
      const startDate = `${selectedMonth}-01`;
      const endDate = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0), "yyyy-MM-dd");
      
      const [incomeRes, withdrawalRes] = await Promise.all([
        supabase.from("worker_income").select("fee").ilike("worker", normalizedWorker).gte("tanggal", startDate).lte("tanggal", endDate),
        supabase.from("salary_withdrawals").select("amount").ilike("worker", normalizedWorker).gte("tanggal", startDate).lte("tanggal", endDate)
      ]);
      
      const totalIncome = incomeRes.data?.reduce((sum, item) => sum + Number(item.fee || 0), 0) || 0;
      const totalWithdrawals = withdrawalRes.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
      
      setSelectedWorkerBalance(totalIncome - totalWithdrawals);
    } catch (error) {
      console.error("Error calculating balance:", error);
      setSelectedWorkerBalance(null);
    } finally {
      setIsCalculatingBalance(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.worker || !formData.amount) {
      toast.error("Worker dan jumlah harus diisi");
      return;
    }

    const withdrawalAmount = Number(formData.amount);
    
    if (withdrawalAmount <= 0) {
      toast.error("Jumlah pengambilan harus lebih dari 0");
      return;
    }

    try {
      const normalizedWorker = normalizeWorkerName(formData.worker);
      
      const startDate = `${selectedMonth}-01`;
      const endDate = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0), "yyyy-MM-dd");
      
      const [incomeRes, withdrawalRes] = await Promise.all([
        supabase.from("worker_income").select("fee").ilike("worker", normalizedWorker).gte("tanggal", startDate).lte("tanggal", endDate),
        supabase.from("salary_withdrawals").select("amount").ilike("worker", normalizedWorker).gte("tanggal", startDate).lte("tanggal", endDate)
      ]);
      
      const totalIncome = incomeRes.data?.reduce((sum, item) => sum + Number(item.fee || 0), 0) || 0;
      const totalWithdrawals = withdrawalRes.data?.reduce((sum, item) => sum + Number(item.amount || 0), 0) || 0;
      const remainingBalance = totalIncome - totalWithdrawals;
      
      if (withdrawalAmount > remainingBalance) {
        toast.error(`Pengambilan melebihi sisa gaji! Sisa gaji ${normalizedWorker}: ${formatCurrency(remainingBalance)}`, { duration: 5000 });
        return;
      }
      
      const { error } = await supabase
        .from("salary_withdrawals")
        .insert([
          {
            worker: normalizedWorker,
            amount: withdrawalAmount,
            catatan: formData.catatan || null
          }
        ]);

      if (error) throw error;

      toast.success("Pengambilan gaji berhasil ditambahkan!");
      setIsDialogOpen(false);
      setFormData({ worker: "", amount: "", catatan: "" });
      setSelectedWorkerBalance(null);
      fetchData();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar activeTable="rekap_gaji" onTableChange={() => {}} />
        
        <main className="flex-1">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold">Rekap Gaji Worker</h1>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6">
            {/* Filter Data Card */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Filter className="h-5 w-5" />
                  Filter Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Worker Filter */}
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Pilih Worker</Label>
                    <Popover open={workerComboboxOpen} onOpenChange={setWorkerComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={workerComboboxOpen}
                          className="w-full justify-between bg-background"
                        >
                          {selectedWorker || "Pilih worker..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cari worker..." />
                          <CommandList>
                            <CommandEmpty>Tidak ada worker ditemukan.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  setSelectedWorker("");
                                  setWorkerComboboxOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", !selectedWorker ? "opacity-100" : "opacity-0")} />
                                Semua Worker
                              </CommandItem>
                              {workers.map((worker) => (
                                <CommandItem
                                  key={worker}
                                  value={worker}
                                  onSelect={(currentValue) => {
                                    setSelectedWorker(currentValue === selectedWorker ? "" : currentValue);
                                    setWorkerComboboxOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedWorker === worker ? "opacity-100" : "opacity-0")} />
                                  {worker}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Month Filter */}
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm font-medium">Pilih Bulan</Label>
                    <Popover open={monthComboboxOpen} onOpenChange={setMonthComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={monthComboboxOpen}
                          className="w-full justify-between bg-background"
                        >
                          {selectedMonth ? format(new Date(selectedMonth), "MMMM yyyy", { locale: id }) : "Pilih bulan..."}
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
                                  <Check className={cn("mr-2 h-4 w-4", selectedMonth === month ? "opacity-100" : "opacity-0")} />
                                  {format(new Date(month), "MMMM yyyy", { locale: id })}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Add Withdrawal Button */}
                  {canWrite && (
                    <div className="flex items-end">
                      <Dialog 
                        open={isDialogOpen} 
                        onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) {
                            setSelectedWorkerBalance(null);
                            setFormData({ worker: "", amount: "", catatan: "" });
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full lg:w-auto bg-emerald-500 hover:bg-emerald-600 text-white">
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
                                              calculateWorkerBalance(currentValue);
                                            }}
                                          >
                                            <Check className={cn("mr-2 h-4 w-4", formData.worker === worker ? "opacity-100" : "opacity-0")} />
                                            {worker}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            
                            {/* Balance display */}
                            {isCalculatingBalance && (
                              <div className="p-3 rounded-lg bg-muted border">
                                <span className="text-sm text-muted-foreground">Menghitung sisa gaji...</span>
                              </div>
                            )}
                            {!isCalculatingBalance && selectedWorkerBalance !== null && (
                              <div className={cn(
                                "p-3 rounded-lg border",
                                selectedWorkerBalance <= 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-green-50 border-green-200'
                              )}>
                                <div className="flex items-center gap-2">
                                  <Wallet className={cn("h-4 w-4", selectedWorkerBalance <= 0 ? 'text-destructive' : 'text-green-600')} />
                                  <span className={cn("text-sm font-medium", selectedWorkerBalance <= 0 ? 'text-destructive' : 'text-green-700')}>
                                    Sisa Gaji: {formatCurrency(selectedWorkerBalance)}
                                  </span>
                                </div>
                                {selectedWorkerBalance <= 0 && (
                                  <p className="text-xs text-destructive mt-1">
                                    ⚠️ Tidak ada sisa gaji untuk diambil
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <Label htmlFor="amount">Jumlah</Label>
                              <Input
                                type="number"
                                placeholder="Masukkan jumlah..."
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                              />
                              {formData.amount && selectedWorkerBalance !== null && Number(formData.amount) > selectedWorkerBalance && (
                                <p className="text-xs text-destructive">
                                  ⚠️ Jumlah melebihi sisa gaji ({formatCurrency(selectedWorkerBalance)})
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="catatan">Catatan (opsional)</Label>
                              <Textarea
                                placeholder="Masukkan catatan..."
                                value={formData.catatan}
                                onChange={(e) => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                              />
                            </div>
                            
                            <Button 
                              type="submit" 
                              className="w-full"
                              disabled={
                                !formData.worker || 
                                !formData.amount || 
                                selectedWorkerBalance === null ||
                                selectedWorkerBalance <= 0 ||
                                Number(formData.amount) <= 0 ||
                                Number(formData.amount) > selectedWorkerBalance
                              }
                            >
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Pendapatan */}
              <Card className="bg-emerald-50 border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Total Pendapatan</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {formatCurrency(summary.totalIncome)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Pengambilan */}
              <Card className="bg-blue-50 border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Pengambilan</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {formatCurrency(summary.totalWithdrawals)}
                      </p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Sisa Saldo */}
              <Card className="bg-emerald-50 border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600">Sisa Saldo</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {formatCurrency(summary.remainingBalance)}
                      </p>
                    </div>
                    <Calculator className="h-8 w-8 text-emerald-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Side-by-Side Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rincian Pendapatan */}
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span>Rincian Pendapatan {selectedWorker && `(${selectedWorker})`}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {incomeTotalCount} data
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : workerIncomes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Tidak ada data pendapatan</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Tanggal</TableHead>
                            <TableHead className="font-semibold">Kode</TableHead>
                            <TableHead className="font-semibold">Jobdesk</TableHead>
                            <TableHead className="font-semibold text-right">Fee</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {workerIncomes.map((income) => (
                            <TableRow key={income.id}>
                              <TableCell className="text-sm">{formatDate(income.tanggal)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {income.code || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{income.jobdesk || "(Tanpa jobdesk)"}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(income.fee)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Pagination for income */}
                      {incomeTotalCount > itemsPerPage && (
                        <div className="p-3 border-t flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Halaman {incomePage} dari {Math.ceil(incomeTotalCount / itemsPerPage)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIncomePage(p => Math.max(1, p - 1))}
                              disabled={incomePage <= 1 || isLoading}
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIncomePage(p => p + 1)}
                              disabled={incomePage >= Math.ceil(incomeTotalCount / itemsPerPage) || isLoading}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rincian Pengambilan Gaji */}
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span>Rincian Pengambilan Gaji</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {withdrawalTotalCount} data
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : salaryWithdrawals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Tidak ada pengambilan gaji</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Tanggal</TableHead>
                            <TableHead className="font-semibold text-right">Jumlah</TableHead>
                            <TableHead className="font-semibold">Catatan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salaryWithdrawals.map((withdrawal) => (
                            <TableRow key={withdrawal.id}>
                              <TableCell className="text-sm">{formatDate(withdrawal.tanggal)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(withdrawal.amount)}
                              </TableCell>
                              <TableCell className="text-sm">{withdrawal.catatan || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {/* Pagination for withdrawals */}
                      {withdrawalTotalCount > itemsPerPage && (
                        <div className="p-3 border-t flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Halaman {withdrawalPage} dari {Math.ceil(withdrawalTotalCount / itemsPerPage)}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawalPage(p => Math.max(1, p - 1))}
                              disabled={withdrawalPage <= 1 || isLoading}
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setWithdrawalPage(p => p + 1)}
                              disabled={withdrawalPage >= Math.ceil(withdrawalTotalCount / itemsPerPage) || isLoading}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
