import { WorkerIncome } from "./FinancialDashboard";
import { TableFilters, FilterOptions } from "./TableFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface WorkerIncomeTableProps {
  data: WorkerIncome[];
  loading: boolean;
  onEdit?: (record: WorkerIncome) => void;
  onDelete?: (record: WorkerIncome) => void;
  isReadOnly?: boolean;
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
  filteredData?: WorkerIncome[];
}

export function WorkerIncomeTable({ 
  data, 
  loading, 
  onEdit, 
  onDelete, 
  isReadOnly = false,
  totalItems = 0,
  currentPage = 1,
  itemsPerPage = 15,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  filters = { searchQuery: "", selectedCode: "all", selectedWorker: "all", selectedMonth: "all", selectedRole: "all", selectedStatus: "all" },
  onFiltersChange,
  filteredData = []
}: WorkerIncomeTableProps) {
  const { isAdmin } = useAuth();
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: '2-digit',
      month: 'long', 
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: '2-digit',
      month: 'short'
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "Rp 0";
    }
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const groupByDay = (data: WorkerIncome[]) => {
    return data.reduce((groups, item) => {
      const date = new Date(item.tanggal).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {} as Record<string, WorkerIncome[]>);
  };

  const groupByMonth = (data: WorkerIncome[]) => {
    return data.reduce((groups, item) => {
      const date = new Date(item.tanggal);
      const monthYear = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(item);
      return groups;
    }, {} as Record<string, WorkerIncome[]>);
  };

  const getMonthName = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month));
    return date.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground animate-pulse">Memuat data pendapatan worker...</div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-dashed">
        <div className="flex flex-col items-center justify-center h-32 space-y-2">
          <Calendar className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-muted-foreground text-lg">Belum ada data pendapatan</div>
          <div className="text-muted-foreground/70 text-sm">Data akan muncul setelah ditambahkan</div>
        </div>
      </Card>
    );
  }

  const renderActionButtons = (record: WorkerIncome) => {
    if (isReadOnly) return null;
    
    return (
      <TableCell className="px-8 py-4 text-center border-l border-border/20">
        <div className="flex gap-3 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(record)}
            className="h-9 w-9 p-0 hover:bg-[#3b82f6]/10 hover:text-[#3b82f6] transition-all duration-200 rounded-lg"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(record)}
            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    );
  };

  const renderWorkerIncomeRow = (record: WorkerIncome, showDate: boolean = true) => (
    <TableRow key={record.id} className="hover:bg-muted/40 transition-colors duration-200 group border-b border-border/10">
      {showDate && (
        <TableCell className="px-6 py-4 font-medium text-muted-foreground border-r border-border/10">
          {formatDateShort(record.tanggal)}
        </TableCell>
      )}
      <TableCell className="px-6 py-4 border-r border-border/10">
        <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 border border-[#3b82f6]/20 font-medium">
          {record.code}
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-4 border-r border-border/10">
        <div className="max-w-[280px] truncate font-medium" title={record.jobdesk}>
          {record.jobdesk}
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 border-r border-border/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3b82f6]/20 to-secondary/20 flex items-center justify-center text-sm font-semibold text-[#3b82f6] border border-[#3b82f6]/20">
            {record.worker && record.worker.length > 0 ? record.worker.charAt(0).toUpperCase() : '?'}
          </div>
          <span className="font-semibold">{record.worker || 'Unknown Worker'}</span>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-right border-r border-border/10">
        <span className="font-bold text-[#3b82f6] text-base">
          {formatCurrency(record.fee)}
        </span>
      </TableCell>
      {renderActionButtons(record)}
    </TableRow>
  );

  // Prepare filter data
  const getAvailableCodes = () => {
    return Array.from(new Set(data.map(record => record.code).filter(Boolean))).sort();
  };

  const getAvailableWorkers = () => {
    return Array.from(new Set(data.map(record => record.worker).filter(Boolean))).sort();
  };

  const getAvailableMonths = () => {
    const months = Array.from(new Set(
      data.map((record) => {
        const date = new Date(record.tanggal);
        return `${date.getFullYear()}-${date.getMonth()}`;
      })
    )).sort().reverse();

    return months.map(monthYear => {
      const [year, month] = monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month));
      return {
        value: monthYear,
        label: date.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })
      };
    });
  };

  const displayData = filteredData.length > 0 ? filteredData : data;
  const dailyGroups = groupByDay(displayData);
  const monthlyGroups = groupByMonth(displayData);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filters */}
      {onSearchChange && onFiltersChange && (
        <TableFilters
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableCodes={getAvailableCodes()}
          availableWorkers={getAvailableWorkers()}
          availableMonths={getAvailableMonths()}
          exportData={filteredData.length > 0 ? filteredData : data}
          tableType="worker_income"
          className="mb-4 md:mb-6"
        />
      )}
      <Tabs defaultValue="daily" className="space-y-4">
      <div className="flex items-center justify-center lg:justify-between">
        <TabsList className="bg-muted/50 border border-border/50 grid grid-cols-2 w-full max-w-md lg:max-w-none lg:w-auto">
          <TabsTrigger value="daily" className="gap-2 text-xs md:text-sm">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Per Hari</span>
            <span className="sm:hidden">Harian</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2 text-xs md:text-sm">
            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Per Bulan</span>
            <span className="sm:hidden">Bulanan</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="daily" className="space-y-4">
        {Object.entries(dailyGroups)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, records]) => {
            const dayTotal = records.reduce((sum, record) => sum + (record.fee || 0), 0);
            const dateObj = new Date(date);
            
            return (
              <Card key={date} className="overflow-hidden shadow-card border-border/50">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-3 md:p-4 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg text-foreground">
                        {formatDate(date)}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {records.length} transaksi
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="text-right sm:flex-shrink-0">
                        <div className="text-lg md:text-2xl font-bold text-primary">
                          {formatCurrency(dayTotal)}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          Total Hari Ini
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile Card View */}
                <div className="lg:hidden p-3 space-y-3">
                  {records.map(record => (
                    <div key={record.id} className="p-3 bg-muted/20 rounded-lg border border-border/20">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] text-xs">
                          {record.code}
                        </Badge>
                        <span className="font-bold text-[#3b82f6] text-sm">
                          {formatCurrency(record.fee)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="text-muted-foreground">Jobdesk: </span>{record.jobdesk}</div>
                        <div><span className="text-muted-foreground">Worker: </span>{record.worker}</div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(record)}
                            className="flex-1 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete?.(record)}
                            className="flex-1 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table className="w-full min-w-[600px]">
                    <TableHeader>
                      <TableRow className="bg-muted/60 border-b-2 border-border/30 hover:bg-muted/60">
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Kode</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Jobdesk</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Worker</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-right">Fee</TableHead>
                        {!isReadOnly && <TableHead className="font-bold text-foreground px-8 py-4 text-center border-l border-border/20">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map(record => renderWorkerIncomeRow(record, false))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
      </TabsContent>

      <TabsContent value="monthly" className="space-y-4">
        {Object.entries(monthlyGroups)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([monthYear, records]) => {
            const monthTotal = records.reduce((sum, record) => sum + (record.fee || 0), 0);
            
            return (
              <Card key={monthYear} className="overflow-hidden shadow-card border-border/50">
                <div className="bg-gradient-to-r from-secondary/5 to-accent/5 p-3 md:p-4 border-b border-border/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg md:text-xl text-foreground">
                        {getMonthName(monthYear)}
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {records.length} transaksi total
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="text-right sm:flex-shrink-0">
                        <div className="text-xl md:text-3xl font-bold text-secondary">
                          {formatCurrency(monthTotal)}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          Total Bulan
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mobile Card View */}
                <div className="lg:hidden p-3 space-y-3">
                  {records
                    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                    .map(record => (
                    <div key={record.id} className="p-3 bg-muted/20 rounded-lg border border-border/20">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] text-xs">
                            {record.code}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateShort(record.tanggal)}
                          </span>
                        </div>
                        <span className="font-bold text-[#3b82f6] text-sm">
                          {formatCurrency(record.fee)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="text-muted-foreground">Jobdesk: </span>{record.jobdesk}</div>
                        <div><span className="text-muted-foreground">Worker: </span>{record.worker}</div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit?.(record)}
                            className="flex-1 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete?.(record)}
                            className="flex-1 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table className="w-full min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted/60 border-b-2 border-border/30 hover:bg-muted/60">
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Tanggal</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Kode</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Jobdesk</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-left">Worker</TableHead>
                        <TableHead className="font-bold text-foreground px-6 py-4 text-right">Fee</TableHead>
                        {!isReadOnly && <TableHead className="font-bold text-foreground px-8 py-4 text-center border-l border-border/20">Aksi</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records
                        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                        .map(record => renderWorkerIncomeRow(record, true))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            );
          })}
      </TabsContent>
    </Tabs>

    {/* Pagination */}
    {totalItems > itemsPerPage && onPageChange && (
      <div className="flex flex-col sm:flex-row items-center justify-between bg-background border border-border/50 rounded-lg px-4 md:px-6 py-4 shadow-sm gap-3">
        <div className="text-xs md:text-sm text-muted-foreground">
          Showing {startIndex + 1} to {endIndex} of {totalItems}
        </div>
        
        <div className="w-full sm:w-auto flex justify-center">
          <Pagination>
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={`border border-border/50 hover:bg-muted/50 ${
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }`}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1)
              .filter(page => {
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 2 && page <= currentPage + 2) return true;
                return false;
              })
              .map((page, index, array) => {
                const prevPage = array[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                
                return (
                  <PaginationItem key={page}>
                    {showEllipsis && (
                      <span className="px-3 py-2 text-muted-foreground text-sm">...</span>
                    )}
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onPageChange(page);
                      }}
                      isActive={currentPage === page}
                      className={`border border-border/50 min-w-[40px] h-10 rounded-md transition-all duration-200 ${
                        currentPage === page 
                          ? "bg-[#3b82f6] text-white border-[#3b82f6] hover:bg-[#2563eb]" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
            
            <PaginationItem>
              <PaginationNext 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < Math.ceil(totalItems / itemsPerPage)) {
                    onPageChange(currentPage + 1);
                  }
                }}
                className={`border border-border/50 hover:bg-muted/50 ${
                  currentPage >= Math.ceil(totalItems / itemsPerPage) ? "pointer-events-none opacity-50" : ""
                }`}
              />
            </PaginationItem>
           </PaginationContent>
          </Pagination>
        </div>
      </div>
    )}
    </div>
  );
}