import { TableType, DataRecord, AdminIncome, WorkerIncome, Expense, Worker } from "./FinancialDashboard";
import { WorkerIncomeTable } from "./WorkerIncomeTable";
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
  onPageChange
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
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Memuat data...</div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Tidak ada data</div>
        </div>
      </Card>
    );
  }

  const renderTableHeaders = () => {
    switch (tableType) {
      case "admin_income":
        return (
          <>
            <TableHead>Tanggal</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Nominal</TableHead>
            {!isReadOnly && <TableHead className="w-[100px]">Aksi</TableHead>}
          </>
        );
      case "expenses":
        return (
          <>
            <TableHead>Tanggal</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Nominal</TableHead>
            {!isReadOnly && <TableHead className="w-[100px]">Aksi</TableHead>}
          </>
        );
      case "workers":
        return (
          <>
            <TableHead>No</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Rekening</TableHead>
            <TableHead>Nomor WA</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            {!isReadOnly && <TableHead className="w-[100px]">Aksi</TableHead>}
          </>
        );
    }
  };

  const renderTableRow = (record: DataRecord) => {
    const commonActions = !isReadOnly ? (
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(record)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(record)}
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
          <TableRow key={adminRecord.id}>
            <TableCell>{formatDate(adminRecord.tanggal)}</TableCell>
            <TableCell>{adminRecord.code || "-"}</TableCell>
            <TableCell>{formatCurrency(adminRecord.nominal)}</TableCell>
            {commonActions}
          </TableRow>
        );

      case "expenses":
        const expenseRecord = record as Expense;
        return (
          <TableRow key={expenseRecord.id}>
            <TableCell>{formatDate(expenseRecord.tanggal)}</TableCell>
            <TableCell>{expenseRecord.keterangan || "-"}</TableCell>
            <TableCell>{formatCurrency(expenseRecord.nominal)}</TableCell>
            {commonActions}
          </TableRow>
        );

      case "workers":
        const workerRecord = record as Worker;
        return (
          <TableRow key={workerRecord.id}>
            <TableCell>{workerRecord.id}</TableCell>
            <TableCell>{workerRecord.nama}</TableCell>
            <TableCell>{workerRecord.rekening || "-"}</TableCell>
            <TableCell>{workerRecord.nomor_wa || "-"}</TableCell>
            <TableCell>{workerRecord.role || "-"}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                workerRecord.status === 'aktif' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {workerRecord.status}
              </span>
            </TableCell>
            {commonActions}
          </TableRow>
        );
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border border-border/50 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              {renderTableHeaders()}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(renderTableRow)}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalItems > itemsPerPage && onPageChange && (
        <div className="flex items-center justify-between bg-background border border-border/50 rounded-lg px-6 py-4 shadow-sm">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {endIndex} of {totalItems}
          </div>
          
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
      )}
    </div>
  );
}