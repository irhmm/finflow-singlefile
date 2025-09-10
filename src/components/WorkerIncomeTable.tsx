import { WorkerIncome } from "./FinancialDashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkerIncomeTableProps {
  data: WorkerIncome[];
  loading: boolean;
  onEdit?: (record: WorkerIncome) => void;
  onDelete?: (record: WorkerIncome) => void;
  isReadOnly?: boolean;
}

export function WorkerIncomeTable({ 
  data, 
  loading, 
  onEdit, 
  onDelete, 
  isReadOnly = false 
}: WorkerIncomeTableProps) {
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
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(record)}
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-200"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(record)}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    );
  };

  const renderWorkerIncomeRow = (record: WorkerIncome, showDate: boolean = true) => (
    <TableRow key={record.id} className="hover:bg-muted/30 transition-colors duration-200 group">
      {showDate && (
        <TableCell className="font-medium text-muted-foreground">
          {formatDateShort(record.tanggal)}
        </TableCell>
      )}
      <TableCell>
        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
          {record.code}
        </Badge>
      </TableCell>
      <TableCell className="font-medium max-w-[200px]">
        <div className="truncate" title={record.jobdesk}>
          {record.jobdesk}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-medium text-primary">
            {record.worker.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium">{record.worker}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="font-semibold text-primary">
          {formatCurrency(record.fee)}
        </span>
      </TableCell>
      {renderActionButtons(record)}
    </TableRow>
  );

  const dailyGroups = groupByDay(data);
  const monthlyGroups = groupByMonth(data);

  return (
    <Tabs defaultValue="daily" className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList className="bg-muted/50 border border-border/50">
          <TabsTrigger value="daily" className="gap-2">
            <Clock className="h-4 w-4" />
            Per Hari
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2">
            <Calendar className="h-4 w-4" />
            Per Bulan
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
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">
                        {formatDate(date)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {records.length} transaksi
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(dayTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Total Hari Ini
                      </div>
                    </div>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Kode</TableHead>
                      <TableHead>Jobdesk</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      {!isReadOnly && <TableHead className="w-[100px] text-center">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map(record => renderWorkerIncomeRow(record, false))}
                  </TableBody>
                </Table>
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
                <div className="bg-gradient-to-r from-secondary/5 to-accent/5 p-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-xl text-foreground">
                        {getMonthName(monthYear)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {records.length} transaksi total
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-secondary">
                        {formatCurrency(monthTotal)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Total Bulan
                      </div>
                    </div>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Jobdesk</TableHead>
                      <TableHead>Worker</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      {!isReadOnly && <TableHead className="w-[100px] text-center">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records
                      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                      .map(record => renderWorkerIncomeRow(record, true))}
                  </TableBody>
                </Table>
              </Card>
            );
          })}
      </TabsContent>
    </Tabs>
  );
}