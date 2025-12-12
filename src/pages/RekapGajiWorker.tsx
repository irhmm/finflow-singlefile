import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Wallet, TrendingDown, Check, ChevronsUpDown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("pendapatan");
  const itemsPerPage = 10;
  const canWrite = ['admin', 'admin_keuangan', 'super_admin'].includes(userRole);

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
      return;
    }

    setIsLoading(true);
    try {
      let incomeQuery = supabase.from("worker_income").select("*");
      let withdrawalQuery = supabase.from("salary_withdrawals").select("*");

      if (selectedMonth) {
        const startDate = `${selectedMonth}-01`;
        const endDate = format(new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0), "yyyy-MM-dd");
        incomeQuery = incomeQuery.gte("tanggal", startDate).lte("tanggal", endDate);
        withdrawalQuery = withdrawalQuery.gte("tanggal", startDate).lte("tanggal", endDate);
      }

      const { data: incomeData, error: incomeError } = await incomeQuery.order("tanggal", { ascending: false });
      if (incomeError) throw new Error(`Gagal mengambil data pendapatan: ${incomeError.message}`);

      const { data: withdrawalData, error: withdrawalError } = await withdrawalQuery.order("tanggal", { ascending: false });
      if (withdrawalError) throw new Error(`Gagal mengambil data pengambilan gaji: ${withdrawalError.message}`);

      const normalizedIncome = (incomeData || []).map(item => ({
        ...item,
        worker: normalizeWorkerName(item.worker)
      }));

      const normalizedWithdrawals = (withdrawalData || []).map(item => ({
        ...item,
        worker: normalizeWorkerName(item.worker)
      }));

      let filteredIncome = normalizedIncome;
      let filteredWithdrawals = normalizedWithdrawals;

      if (selectedWorker) {
        const normalizedSelectedWorker = normalizeWorkerName(selectedWorker);
        filteredIncome = normalizedIncome.filter(item => 
          normalizeWorkerName(item.worker) === normalizedSelectedWorker
        );
        filteredWithdrawals = normalizedWithdrawals.filter(item => 
          normalizeWorkerName(item.worker) === normalizedSelectedWorker
        );
      }

      setWorkerIncomes(filteredIncome);
      setSalaryWithdrawals(filteredWithdrawals);

      const totalIncome = filteredIncome.reduce((sum, item) => {
        const fee = Number(item.fee);
        return sum + (isNaN(fee) ? 0 : fee);
      }, 0);
      
      const totalWithdrawals = filteredWithdrawals.reduce((sum, item) => {
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

  const formatDateShort = (dateString: string) => {
    return format(new Date(dateString), "dd MMM", { locale: id });
  };

  // Pagination logic
  const incomeStartIndex = (incomeCurrentPage - 1) * itemsPerPage;
  const paginatedIncomes = workerIncomes.slice(incomeStartIndex, incomeStartIndex + itemsPerPage);
  const incomeTotalPages = Math.ceil(workerIncomes.length / itemsPerPage);

  const withdrawalStartIndex = (withdrawalCurrentPage - 1) * itemsPerPage;
  const paginatedWithdrawals = salaryWithdrawals.slice(withdrawalStartIndex, withdrawalStartIndex + itemsPerPage);
  const withdrawalTotalPages = Math.ceil(salaryWithdrawals.length / itemsPerPage);

  // Calculate progress percentage
  const progressPercent = summary.totalIncome > 0 
    ? Math.round((summary.totalWithdrawals / summary.totalIncome) * 100) 
    : 0;

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
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold">Rekap Gaji Worker</h1>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
            {/* Filter Section - Compact */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Worker Filter */}
              <Popover open={workerComboboxOpen} onOpenChange={setWorkerComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={workerComboboxOpen}
                    className="flex-1 justify-between"
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

              {/* Month Filter */}
              <Popover open={monthComboboxOpen} onOpenChange={setMonthComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={monthComboboxOpen}
                    className="flex-1 justify-between"
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

            {/* Summary Card - Large with Progress */}
            {(selectedWorker || selectedMonth) && (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Main Balance Display */}
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Wallet className="h-5 w-5" />
                        <span className="text-sm font-medium">Sisa Gaji</span>
                      </div>
                      <p className={cn(
                        "text-4xl font-bold",
                        summary.remainingBalance >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {formatCurrency(summary.remainingBalance)}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress 
                        value={progressPercent} 
                        className="h-3"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Diambil {progressPercent}%</span>
                        <span>Tersisa {100 - progressPercent}%</span>
                      </div>
                    </div>

                    {/* Income vs Withdrawal Summary */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-green-600 mb-1">
                          <ArrowDownCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Pendapatan</span>
                        </div>
                        <p className="text-lg font-semibold text-green-700">{formatCurrency(summary.totalIncome)}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-orange-600 mb-1">
                          <ArrowUpCircle className="h-4 w-4" />
                          <span className="text-xs font-medium">Diambil</span>
                        </div>
                        <p className="text-lg font-semibold text-orange-700">{formatCurrency(summary.totalWithdrawals)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedWorker && !selectedMonth && (
              <Card className="p-8 border-dashed">
                <div className="flex flex-col items-center justify-center space-y-3 text-center">
                  <Wallet className="h-12 w-12 text-muted-foreground/40" />
                  <div>
                    <h3 className="text-lg font-semibold">Pilih Worker & Bulan</h3>
                    <p className="text-sm text-muted-foreground">
                      Silakan pilih filter untuk melihat rekap gaji
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Data Tables with Tabs */}
            {(selectedWorker || selectedMonth) && (
              <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="pendapatan" className="gap-2">
                      <ArrowDownCircle className="h-4 w-4" />
                      Pendapatan ({workerIncomes.length})
                    </TabsTrigger>
                    <TabsTrigger value="pengambilan" className="gap-2">
                      <ArrowUpCircle className="h-4 w-4" />
                      Pengambilan ({salaryWithdrawals.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Pendapatan Tab */}
                  <TabsContent value="pendapatan" className="p-4 space-y-3">
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : paginatedIncomes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p>Tidak ada data pendapatan</p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View */}
                        <div className="space-y-2">
                          {paginatedIncomes.map((income) => (
                            <div 
                              key={income.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {income.jobdesk || "(Tanpa jobdesk)"} 
                                  <span className="text-muted-foreground ml-1">({income.code})</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDateShort(income.tanggal)}</p>
                              </div>
                              <p className="font-semibold text-green-600 ml-3">{formatCurrency(income.fee)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {incomeTotalPages > 1 && (
                          <div className="flex items-center justify-between pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIncomeCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={incomeCurrentPage === 1}
                            >
                              ← Prev
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {incomeCurrentPage} / {incomeTotalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIncomeCurrentPage(prev => Math.min(prev + 1, incomeTotalPages))}
                              disabled={incomeCurrentPage === incomeTotalPages}
                            >
                              Next →
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>

                  {/* Pengambilan Tab */}
                  <TabsContent value="pengambilan" className="p-4 space-y-3">
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : paginatedWithdrawals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p>Tidak ada pengambilan gaji</p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile Card View */}
                        <div className="space-y-2">
                          {paginatedWithdrawals.map((withdrawal) => (
                            <div 
                              key={withdrawal.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {withdrawal.catatan || "Pengambilan gaji"}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDateShort(withdrawal.tanggal)}</p>
                              </div>
                              <p className="font-semibold text-orange-600 ml-3">-{formatCurrency(withdrawal.amount)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {withdrawalTotalPages > 1 && (
                          <div className="flex items-center justify-between pt-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWithdrawalCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={withdrawalCurrentPage === 1}
                            >
                              ← Prev
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {withdrawalCurrentPage} / {withdrawalTotalPages}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setWithdrawalCurrentPage(prev => Math.min(prev + 1, withdrawalTotalPages))}
                              disabled={withdrawalCurrentPage === withdrawalTotalPages}
                            >
                              Next →
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            )}

            {/* Add Withdrawal Button - Fixed at bottom on mobile */}
            {canWrite && (selectedWorker || selectedMonth) && (
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
                  <Button className="w-full" size="lg">
                    <Plus className="h-5 w-5 mr-2" />
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
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
