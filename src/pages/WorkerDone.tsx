import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CheckCircle2, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface WorkerMonthlyStatus {
  id: string;
  worker_name: string;
  month: string;
  year: number;
  status: 'done' | 'proses';
  total_income: number;
  created_at: string;
  updated_at: string;
}

interface MonthOption {
  value: string;
  label: string;
}

const WorkerDone = () => {
  const { user, canEdit, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workers, setWorkers] = useState<WorkerMonthlyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const itemsPerPage = 10;
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !canEdit)) {
      toast({
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses halaman ini',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, canEdit, authLoading, navigate, toast]);

  // Optimized: Fetch available months with DISTINCT query
  const fetchAvailableMonths = async () => {
    try {
      // Get distinct dates only (limit to last 365 days for performance)
      const { data, error } = await supabase
        .from('worker_income')
        .select('tanggal')
        .order('tanggal', { ascending: false })
        .limit(1000); // Limit rows, not months
      
      if (error) throw error;
      
      // Extract unique months from data efficiently
      const monthSet = new Set<string>();
      data?.forEach(item => {
        monthSet.add(format(new Date(item.tanggal), 'yyyy-MM'));
      });
      
      const uniqueMonths = Array.from(monthSet).sort().reverse();
      
      // Convert to options format
      const monthOptions = uniqueMonths.map(month => ({
        value: month,
        label: format(new Date(`${month}-01`), 'MMMM yyyy', { locale: idLocale })
      }));
      
      setAvailableMonths(monthOptions);
      
      // Auto-select the most recent month that has data
      if (monthOptions.length > 0 && !selectedMonth) {
        setSelectedMonth(monthOptions[0].value);
      }
    } catch (error) {
      console.error('Error fetching available months:', error);
    }
  };

  useEffect(() => {
    if (user && canEdit) {
      fetchAvailableMonths();
    }
  }, [user, canEdit]);

  useEffect(() => {
    if (user && canEdit && selectedMonth) {
      fetchData();
    }
  }, [selectedMonth, user, canEdit]);

  const normalizeWorkerName = (name: string): string => {
    if (!name || !name.trim()) return '(Unknown)';
    const trimmed = name.trim();
    return trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // OPTIMIZED: Batch fetch all data and calculate in JavaScript
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const startDate = format(startOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');
      const year = parseInt(selectedMonth.split('-')[0]);

      // BATCH QUERY 1: Get all worker_income for the month
      const { data: incomeData, error: incomeError } = await supabase
        .from('worker_income')
        .select('worker, fee')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (incomeError) throw incomeError;

      // BATCH QUERY 2: Get all salary_withdrawals for the month
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('salary_withdrawals')
        .select('worker, amount')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (withdrawalError) throw withdrawalError;

      // BATCH QUERY 3: Get existing worker_monthly_status for the month
      const { data: existingStatuses, error: statusError } = await supabase
        .from('worker_monthly_status')
        .select('*')
        .eq('month', selectedMonth);

      if (statusError) throw statusError;

      // JAVASCRIPT AGGREGATION: Calculate income by worker (case-insensitive)
      const incomeByWorker: Record<string, number> = {};
      const uniqueWorkersSet = new Set<string>();
      
      incomeData?.forEach(item => {
        const normalizedName = normalizeWorkerName(item.worker);
        uniqueWorkersSet.add(normalizedName);
        incomeByWorker[normalizedName] = (incomeByWorker[normalizedName] || 0) + Number(item.fee || 0);
      });

      // JAVASCRIPT AGGREGATION: Calculate withdrawals by worker (case-insensitive)
      const withdrawalByWorker: Record<string, number> = {};
      withdrawalData?.forEach(item => {
        const normalizedName = normalizeWorkerName(item.worker);
        withdrawalByWorker[normalizedName] = (withdrawalByWorker[normalizedName] || 0) + Number(item.amount || 0);
      });

      // Create status lookup map for existing statuses
      const statusByWorker: Record<string, WorkerMonthlyStatus> = {};
      existingStatuses?.forEach(status => {
        statusByWorker[status.worker_name] = status as WorkerMonthlyStatus;
      });

      // Process all workers and prepare data
      const uniqueWorkers = Array.from(uniqueWorkersSet);
      const workersToUpsert: Array<{
        worker_name: string;
        month: string;
        year: number;
        status: string;
        total_income: number;
      }> = [];
      
      const workerStatuses: WorkerMonthlyStatus[] = [];

      for (const workerName of uniqueWorkers) {
        const totalIncome = incomeByWorker[workerName] || 0;
        const totalWithdrawals = withdrawalByWorker[workerName] || 0;
        const netIncome = totalIncome - totalWithdrawals;
        
        const existingStatus = statusByWorker[workerName];
        
        if (existingStatus) {
          // Check if we need to update
          if (existingStatus.total_income !== netIncome) {
            workersToUpsert.push({
              worker_name: workerName,
              month: selectedMonth,
              year: year,
              status: existingStatus.status,
              total_income: netIncome
            });
          }
          workerStatuses.push({ ...existingStatus, total_income: netIncome });
        } else {
          // New worker, need to create
          workersToUpsert.push({
            worker_name: workerName,
            month: selectedMonth,
            year: year,
            status: 'proses',
            total_income: netIncome
          });
          workerStatuses.push({
            id: `temp-${workerName}`, // Temporary ID until upsert
            worker_name: workerName,
            month: selectedMonth,
            year: year,
            status: 'proses',
            total_income: netIncome,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // BATCH UPSERT: Update/insert all statuses in one query
      if (workersToUpsert.length > 0) {
        const { data: upsertedData, error: upsertError } = await supabase
          .from('worker_monthly_status')
          .upsert(workersToUpsert, { 
            onConflict: 'worker_name,month',
            ignoreDuplicates: false
          })
          .select();

        if (upsertError) {
          console.error('Error upserting statuses:', upsertError);
        } else if (upsertedData) {
          // Update temporary IDs with real IDs
          upsertedData.forEach(upserted => {
            const idx = workerStatuses.findIndex(
              w => w.worker_name === upserted.worker_name && w.id.startsWith('temp-')
            );
            if (idx !== -1) {
              workerStatuses[idx] = { ...workerStatuses[idx], id: upserted.id };
            }
          });
        }
      }
      
      // Sort: proses first, done last, then alphabetically
      workerStatuses.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'proses' ? -1 : 1;
        }
        return a.worker_name.localeCompare(b.worker_name);
      });
      
      setWorkers(workerStatuses);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data worker',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced fetch for real-time updates
  const debouncedFetch = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      fetchData();
    }, 1000); // 1 second debounce
  }, [selectedMonth]);

  // Real-time subscription with debounce
  useEffect(() => {
    if (!user || !canEdit || !selectedMonth) return;

    const channel = supabase
      .channel('worker-done-salary-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'salary_withdrawals'
        },
        () => {
          debouncedFetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [user, canEdit, selectedMonth, debouncedFetch]);

  const handleToggleStatus = async (id: string, currentStatus: 'done' | 'proses') => {
    const newStatus = currentStatus === 'done' ? 'proses' : 'done';
    
    try {
      const { error } = await supabase
        .from('worker_monthly_status')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state and re-sort
      setWorkers(prev => {
        const updated = prev.map(w => 
          w.id === id ? { ...w, status: newStatus as 'done' | 'proses' } : w
        );
        return updated.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'proses' ? -1 : 1;
          }
          return a.worker_name.localeCompare(b.worker_name);
        });
      });
      
      toast({
        title: 'Berhasil',
        description: `Status diubah menjadi ${newStatus === 'done' ? 'Dibayar' : 'Belum Dibayar'}`,
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Gagal mengubah status',
        variant: 'destructive',
      });
    }
  };

  // Filter workers by search query
  const filteredWorkers = workers.filter(w => 
    w.worker_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Statistics
  const totalDone = filteredWorkers.filter(w => w.status === 'done').length;
  const totalProses = filteredWorkers.filter(w => w.status === 'proses').length;
  const totalIncome = filteredWorkers
    .filter(w => w.status === 'proses')
    .reduce((sum, w) => sum + Number(w.total_income || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTable={"worker_done" as any} onTableChange={() => {}} />
        <main className="flex-1 p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Status Pembayaran Gaji Worker</h1>
                <p className="text-muted-foreground mt-1">Kelola status pembayaran gaji worker per bulan</p>
              </div>
              <Button onClick={fetchData} disabled={isLoading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Dibayar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalDone} Workers</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Belum Dibayar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{totalProses} Workers</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Sisa Gaji</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Periode</label>
                    <Select
                      value={selectedMonth}
                      onValueChange={(value) => setSelectedMonth(value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Pilih periode" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableMonths.length === 0 ? (
                          <SelectItem value="no-data" disabled>Tidak ada data</SelectItem>
                        ) : (
                          availableMonths.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Cari Worker</label>
                    <input
                      type="text"
                      placeholder="Cari nama worker..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : paginatedWorkers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">Tidak ada data untuk bulan ini</p>
                    <p className="text-sm text-muted-foreground mt-2">Coba pilih bulan atau tahun lain</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">No</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Worker</th>
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Sisa Gaji</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedWorkers.map((worker, index) => (
                            <tr key={worker.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4 text-muted-foreground">
                                {startIndex + index + 1}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                      {worker.worker_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-foreground">{worker.worker_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-foreground">
                                {formatCurrency(worker.total_income)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Badge 
                                  variant={worker.status === 'done' ? 'default' : 'secondary'}
                                  className={worker.status === 'done' 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                  }
                                >
                                  {worker.status === 'done' ? (
                                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Dibayar</>
                                  ) : (
                                    <><Clock className="h-3 w-3 mr-1" /> Belum Dibayar</>
                                  )}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <Button
                                  size="sm"
                                  variant={worker.status === 'done' ? 'outline' : 'default'}
                                  onClick={() => handleToggleStatus(worker.id, worker.status)}
                                >
                                  {worker.status === 'done' ? 'Batalkan' : 'Tandai Dibayar'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredWorkers.length)} dari {filteredWorkers.length} worker
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Halaman {currentPage} dari {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default WorkerDone;
