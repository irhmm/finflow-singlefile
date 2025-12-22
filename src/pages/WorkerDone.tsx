import { useEffect, useState } from 'react';
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

  // Fetch available months from database
  const fetchAvailableMonths = async () => {
    try {
      const { data, error } = await supabase
        .from('worker_income')
        .select('tanggal')
        .order('tanggal', { ascending: false });
      
      if (error) throw error;
      
      // Extract unique months from data
      const uniqueMonths = Array.from(new Set(
        data?.map(item => format(new Date(item.tanggal), 'yyyy-MM')) || []
      )).sort().reverse();
      
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
    // Capitalize first letter of EACH word for proper name handling
    return trimmed
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Calculate net income (Total Income - Total Withdrawals)
  // This ensures Worker Done page syncs with Rekap Gaji Worker
  const calculateWorkerNetIncome = async (workerName: string, month: string) => {
    const startDate = format(startOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd');

    // Calculate total income from worker_income (case-insensitive query)
    const { data: incomeData, error: incomeError } = await supabase
      .from('worker_income')
      .select('fee')
      .ilike('worker', workerName)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    if (incomeError) {
      console.error('Error calculating income:', incomeError);
      return 0;
    }
    
    const totalIncome = incomeData.reduce((sum, item) => sum + (Number(item.fee) || 0), 0);

    // Calculate total withdrawals from salary_withdrawals (case-insensitive query)
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('salary_withdrawals')
      .select('amount')
      .ilike('worker', workerName)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    if (withdrawalError) {
      console.error('Error calculating withdrawals:', withdrawalError);
      return totalIncome; // Return income only if withdrawal fetch fails
    }
    
    const totalWithdrawals = withdrawalData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    // Return net income (income - withdrawals)
    return totalIncome - totalWithdrawals;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get all unique workers from worker_income for selected month
      const startDate = format(startOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');

      const { data: workerIncomeData, error: workerError } = await supabase
        .from('worker_income')
        .select('worker')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);

      if (workerError) throw workerError;

      // Get unique normalized worker names
      const uniqueWorkers = Array.from(
        new Set(workerIncomeData?.map(w => normalizeWorkerName(w.worker)) || [])
      );

      // Fetch or create worker_monthly_status for each worker
      const workerStatusPromises = uniqueWorkers.map(async (workerName) => {
        // Check if status exists
        const { data: existingStatus, error: fetchError } = await supabase
          .from('worker_monthly_status')
          .select('*')
          .eq('worker_name', workerName)
          .eq('month', selectedMonth)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching status:', fetchError);
          return null;
        }

        // Calculate net income (income - withdrawals)
        const netIncome = await calculateWorkerNetIncome(workerName, selectedMonth);

        if (existingStatus) {
          // Update total_income if different
          if (existingStatus.total_income !== netIncome) {
            const { error: updateError } = await supabase
              .from('worker_monthly_status')
              .update({ total_income: netIncome })
              .eq('id', existingStatus.id);

            if (updateError) console.error('Error updating income:', updateError);
          }
          return { ...existingStatus, total_income: netIncome };
        } else {
          // Create new status
          const year = parseInt(selectedMonth.split('-')[0]);
          const { data: newStatus, error: insertError } = await supabase
            .from('worker_monthly_status')
            .insert({
              worker_name: workerName,
              month: selectedMonth,
              year: year,
              status: 'proses',
              total_income: netIncome,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating status:', insertError);
            return null;
          }
          return newStatus;
        }
      });

      const workerStatuses = (await Promise.all(workerStatusPromises)).filter(Boolean) as WorkerMonthlyStatus[];
      
      // Sort by status first (proses/unpaid first, done/paid last), then by name
      workerStatuses.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'proses' ? -1 : 1;
        }
        return a.worker_name.localeCompare(b.worker_name);
      });
      
      setWorkers(workerStatuses);
      setCurrentPage(1); // Reset to first page when data changes
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

  // Real-time subscription to salary_withdrawals for auto-sync with RekapGajiWorker
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
          // Re-fetch data when salary_withdrawals changes
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, canEdit, selectedMonth]);

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
        // Re-sort: proses first, done last, then alphabetically
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
  // Only calculate total from workers who haven't been paid yet
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
                              <td className="py-4 px-4 text-foreground">{startIndex + index + 1}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                      {worker.worker_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium text-foreground">{worker.worker_name}</span>
                                </div>
                              </td>
                              <td className={`py-4 px-4 text-right font-semibold ${worker.status === 'done' ? 'text-green-600' : 'text-foreground'}`}>
                                {worker.status === 'done' 
                                  ? formatCurrency(0) 
                                  : formatCurrency(Number(worker.total_income || 0))}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <Badge
                                  variant={worker.status === 'done' ? 'default' : 'secondary'}
                                  className={
                                    worker.status === 'done'
                                      ? 'bg-green-500 hover:bg-green-600 text-white'
                                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                  }
                                >
                                  {worker.status === 'done' ? (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Dibayar
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 mr-1" />
                                      Belum Dibayar
                                    </>
                                  )}
                                </Badge>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleStatus(worker.id, worker.status)}
                                >
                                  Done
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
                        <div className="text-sm text-muted-foreground">
                          Menampilkan {startIndex + 1} - {Math.min(endIndex, filteredWorkers.length)} dari {filteredWorkers.length} worker
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
