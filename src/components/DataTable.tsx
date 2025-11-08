import { TableType, DataRecord, AdminIncome, WorkerIncome, Expense, Worker } from "./FinancialDashboard";
import { WorkerIncomeTable } from "./WorkerIncomeTable";
import { TableFilters, FilterOptions } from "./TableFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
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

interface DataTableProps {
  data: DataRecord[];
  tableType: TableType;
  loading: boolean;
  onEdit?: (record: DataRecord) => void;
  onDelete?: (record: DataRecord) => void;
  isReadOnly?: boolean;
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
  filteredData?: DataRecord[];
}

export function DataTable({ 
  data, 
  tableType, 
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
}: DataTableProps) {
  // Use special component for worker_income table
  if (tableType === "worker_income") {
    return (
      <WorkerIncomeTable
        data={data as WorkerIncome[]}
        loading={loading}
        onEdit={onEdit as ((record: WorkerIncome) => void) | undefined}
        onDelete={onDelete as ((record: WorkerIncome) => void) | undefined}
        isReadOnly={isReadOnly}
        totalItems={totalItems}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filteredData={filteredData as WorkerIncome[]}
      />
    );
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "Rp 0";
    }
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  if (loading) {
    return (
      <Card className="p-8 border-dashed">
        <div className="flex flex-col items-center justify-center h-32 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <div className="text-muted-foreground animate-pulse">Memuat data...</div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-dashed">
        <div className="flex flex-col items-center justify-center h-32 space-y-2">
          <div className="text-muted-foreground text-lg">
            {searchQuery || filters.selectedCode !== "all" || filters.selectedMonth !== "all"
              ? "Tidak ada data yang sesuai dengan filter"
              : "Belum ada data"}
          </div>
          <div className="text-muted-foreground/70 text-sm">
            {searchQuery || filters.selectedCode !== "all" || filters.selectedMonth !== "all"
              ? "Coba ubah atau hapus filter untuk melihat lebih banyak data"
              : "Data akan muncul setelah ditambahkan"}
          </div>
        </div>
      </Card>
    );
  }

  const renderTableHeaders = () => {
    switch (tableType) {
      case "admin_income":
        return (
          <>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Tanggal</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Code</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-right">Nominal</TableHead>
            {!isReadOnly && <TableHead className="font-bold text-foreground px-8 py-4 text-center border-l border-border/20">Aksi</TableHead>}
          </>
        );
      case "expenses":
        return (
          <>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Tanggal</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Keterangan</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-right">Nominal</TableHead>
            {!isReadOnly && <TableHead className="font-bold text-foreground px-8 py-4 text-center border-l border-border/20">Aksi</TableHead>}
          </>
        );
      case "workers":
        return (
          <>
            <TableHead className="font-bold text-foreground px-6 py-4 text-center">No</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Nama</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Rekening</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Nomor WA</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-left">Role</TableHead>
            <TableHead className="font-bold text-foreground px-6 py-4 text-center">Status</TableHead>
            {!isReadOnly && <TableHead className="font-bold text-foreground px-8 py-4 text-center border-l border-border/20">Aksi</TableHead>}
          </>
        );
    }
  };

  const renderTableRow = (record: DataRecord) => {
    const commonActions = !isReadOnly ? (
      <TableCell className="px-8 py-4 text-center border-l border-border/20">
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(record)}
            className="h-9 w-9 p-0 hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/50 hover:text-[#3b82f6] transition-all duration-200 rounded-lg"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(record)}
            className="h-9 w-9 p-0 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-200 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    ) : null;

    switch (tableType) {
      case "admin_income":
        const adminRecord = record as AdminIncome;
        return (
          <TableRow key={adminRecord.id} className="hover:bg-muted/40 transition-colors duration-200 border-b border-border/10">
            <TableCell className="px-6 py-4 border-r border-border/10 font-medium">{formatDate(adminRecord.tanggal)}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10">{adminRecord.code || "-"}</TableCell>
            <TableCell className="px-6 py-4 text-right font-semibold text-[#3b82f6] border-r border-border/10">{formatCurrency(adminRecord.nominal)}</TableCell>
            {commonActions}
          </TableRow>
        );

      case "expenses":
        const expenseRecord = record as Expense;
        return (
          <TableRow key={expenseRecord.id} className="hover:bg-muted/40 transition-colors duration-200 border-b border-border/10">
            <TableCell className="px-6 py-4 border-r border-border/10 font-medium">{formatDate(expenseRecord.tanggal)}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10">{expenseRecord.keterangan || "-"}</TableCell>
            <TableCell className="px-6 py-4 text-right font-semibold text-[#3b82f6] border-r border-border/10">{formatCurrency(expenseRecord.nominal)}</TableCell>
            {commonActions}
          </TableRow>
        );

      case "workers":
        const workerRecord = record as Worker;
        return (
          <TableRow key={workerRecord.id} className="hover:bg-muted/40 transition-colors duration-200 border-b border-border/10">
            <TableCell className="px-6 py-4 border-r border-border/10 text-center font-medium text-muted-foreground">{workerRecord.id}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10 font-semibold">{workerRecord.nama}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10 font-mono text-sm">{workerRecord.rekening || "-"}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10">{workerRecord.nomor_wa || "-"}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10">{workerRecord.role || "-"}</TableCell>
            <TableCell className="px-6 py-4 border-r border-border/10 text-center">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${
                workerRecord.status === 'aktif' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {workerRecord.status}
              </span>
            </TableCell>
            {commonActions}
          </TableRow>
        );
    }
  };

  // Prepare filter data
  const getAvailableCodes = () => {
    return Array.from(new Set(
      data.map((record) => {
        if (tableType === "admin_income") return (record as AdminIncome).code;
        return "";
      }).filter(Boolean)
    )).sort();
  };

  const getAvailableMonths = () => {
    const months = Array.from(new Set(
      data.map((record) => {
        const date = new Date((record as any).tanggal);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      })
    )).sort().reverse();

    return months.map(monthYear => {
      const [year, month] = monthYear.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return {
        value: monthYear,
        label: date.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })
      };
    });
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div className="space-y-6">
      {/* Filters */}
      {onSearchChange && onFiltersChange && (
        <TableFilters
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableCodes={getAvailableCodes()}
          availableWorkers={[]}
          availableMonths={getAvailableMonths()}
          exportData={filteredData.length > 0 ? filteredData : data}
          tableType={tableType as "admin_income" | "worker_income"}
          className="mb-6"
        />
      )}
      <Card className="overflow-hidden border border-border/30 shadow-lg rounded-xl">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/60 border-b-2 border-border/30 hover:bg-muted/60">
                {renderTableHeaders()}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(renderTableRow)}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalItems > itemsPerPage && onPageChange && (
        <div className="flex items-center bg-background border border-border/50 rounded-lg px-6 py-4 shadow-sm">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {totalItems}
          </div>
          
          <div className="ml-auto">
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