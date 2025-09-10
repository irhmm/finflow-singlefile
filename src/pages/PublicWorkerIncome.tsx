import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from '@/integrations/supabase/client';

interface WorkerIncome {
  id: number;
  tanggal: string;
  code: string;
  jobdesk: string;
  worker: string;
  fee: number;
}

export default function PublicWorkerIncome() {
  const [data, setData] = useState<WorkerIncome[]>([]);
  const [filteredData, setFilteredData] = useState<WorkerIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = data.filter((record) =>
      record.code.toLowerCase().includes(query) ||
      record.jobdesk.toLowerCase().includes(query) ||
      record.worker.toLowerCase().includes(query)
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: workerIncomeData, error } = await supabase
        .from('worker_income')
        .select('*')
        .order('tanggal', { ascending: false });

      if (error) {
        console.error('Error loading data:', error);
        return;
      }

      setData(workerIncomeData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID");
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return "Rp 0";
    }
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const calculateTotal = () => {
    return filteredData.reduce((sum, record) => sum + (record.fee || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Data Pendapatan Worker</h1>
          <p className="text-muted-foreground">
            Transparansi data pendapatan pekerja untuk publik
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cari berdasarkan kode, jobdesk, atau worker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Data</div>
            <div className="text-2xl font-bold">{filteredData.length} entri</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Fee</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculateTotal())}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Rata-rata Fee</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(filteredData.length > 0 ? calculateTotal() / filteredData.length : 0)}
            </div>
          </Card>
        </div>

        {filteredData.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">
                {searchQuery ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data"}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Jobdesk</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.tanggal)}</TableCell>
                    <TableCell>{record.code}</TableCell>
                    <TableCell>{record.jobdesk}</TableCell>
                    <TableCell>{record.worker}</TableCell>
                    <TableCell>{formatCurrency(record.fee)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Data diperbarui secara real-time • Hanya untuk keperluan transparansi</p>
        </div>
      </div>
    </div>
  );
}