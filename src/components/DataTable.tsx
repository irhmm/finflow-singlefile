import { TableType, DataRecord, AdminIncome, WorkerIncome, Expense } from "./FinancialDashboard";
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

interface DataTableProps {
  data: DataRecord[];
  tableType: TableType;
  loading: boolean;
  onEdit: (record: DataRecord) => void;
  onDelete: (record: DataRecord) => void;
}

export function DataTable({ data, tableType, loading, onEdit, onDelete }: DataTableProps) {
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
            <TableHead className="w-[100px]">Aksi</TableHead>
          </>
        );
      case "worker_income":
        return (
          <>
            <TableHead>Tanggal</TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Jobdesk</TableHead>
            <TableHead>Worker</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead className="w-[100px]">Aksi</TableHead>
          </>
        );
      case "expenses":
        return (
          <>
            <TableHead>Tanggal</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Nominal</TableHead>
            <TableHead className="w-[100px]">Aksi</TableHead>
          </>
        );
    }
  };

  const renderTableRow = (record: DataRecord) => {
    const commonActions = (
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(record)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(record)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    );

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

      case "worker_income":
        const workerRecord = record as WorkerIncome;
        return (
          <TableRow key={workerRecord.id}>
            <TableCell>{formatDate(workerRecord.tanggal)}</TableCell>
            <TableCell>{workerRecord.code}</TableCell>
            <TableCell>{workerRecord.jobdesk}</TableCell>
            <TableCell>{workerRecord.worker}</TableCell>
            <TableCell>{formatCurrency(workerRecord.fee)}</TableCell>
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
    }
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {renderTableHeaders()}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(renderTableRow)}
        </TableBody>
      </Table>
    </Card>
  );
}