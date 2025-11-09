import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
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

const WorkerDone = () => {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workers, setWorkers] = useState<WorkerMonthlyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) {
      navigate('/admin-login');
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && (isAdmin || isSuperAdmin)) {
      fetchData();
    }
  }, [selectedMonth, selectedYear, user, isAdmin, isSuperAdmin]);

  const normalizeWorkerName = (name: string): string => {
    if (!name || !name.trim()) return '(Unknown)';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const calculateWorkerMonthlyIncome = async (workerName: string, month: string) => {
    const startDate = format(startOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(`${month}-01`)), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('worker_income')
      .select('fee')
      .eq('worker', workerName)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    if (error) {
      console.error('Error calculating income:', error);
      return 0;
    }
    
    return data.reduce((sum, item) => sum + (Number(item.fee) || 0), 0);
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

        // Calculate total income
        const totalIncome = await calculateWorkerMonthlyIncome(workerName, selectedMonth);

        if (existingStatus) {
          // Update total_income if different
          if (existingStatus.total_income !== totalIncome) {
            const { error: updateError } = await supabase
              .from('worker_monthly_status')
              .update({ total_income: totalIncome })
              .eq('id', existingStatus.id);

            if (updateError) console.error('Error updating income:', updateError);
          }
          return { ...existingStatus, total_income: totalIncome };
        } else {
          // Create new status
          const { data: newStatus, error: insertError } = await supabase
            .from('worker_monthly_status')
            .insert({
              worker_name: workerName,
              month: selectedMonth,
              year: selectedYear,
              status: 'proses',
              total_income: totalIncome,
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
      
      // Sort by worker name
      workerStatuses.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
      
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

  const handleToggleStatus = async (id: string, currentStatus: 'done' | 'proses') => {
    const newStatus = currentStatus === 'done' ? 'proses' : 'done';
    
    try {
      const { error } = await supabase
        .from('worker_monthly_status')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setWorkers(prev => prev.map(w => 
        w.id === id ? { ...w, status: newStatus } : w
      ));
      
      toast({
        title: 'Berhasil',
        description: `Status diubah menjadi ${newStatus === 'done' ? 'Done' : 'Proses'}`,
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

  // Generate year options (from 2020 to current year + 1)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 2019 + 1 }, (_, i) => 2020 + i);

  // Generate month options
  const monthOptions = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

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
  const totalIncome = filteredWorkers.reduce((sum, w) => sum + Number(w.total_income || 0), 0);

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
        <AppSidebar activeTable="worker_done" onTableChange={() => {}} />
        <main className="flex-1 p-6 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Worker Done Status</h1>
                <p className="text-muted-foreground mt-1">Kelola status penyelesaian worker per bulan</p>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Done</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalDone} Workers</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Proses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{totalProses} Workers</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendapatan</CardTitle>
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
                    <label className="text-sm font-medium mb-2 block">Bulan</label>
                    <Select
                      value={selectedMonth.split('-')[1]}
                      onValueChange={(month) => {
                        setSelectedMonth(`${selectedYear}-${month}`);
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Tahun</label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(year) => {
                        const newYear = parseInt(year);
                        setSelectedYear(newYear);
                        const currentMonth = selectedMonth.split('-')[1];
                        setSelectedMonth(`${newYear}-${currentMonth}`);
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
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
                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Pendapatan</th>
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
                              <td className="py-4 px-4 text-right font-semibold text-foreground">
                                {formatCurrency(Number(worker.total_income || 0))}
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
                                      Done
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="h-3 w-3 mr-1" />
                                      Proses
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
                                  Toggle
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
