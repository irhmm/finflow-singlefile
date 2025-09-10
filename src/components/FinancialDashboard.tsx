import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DataTable } from "./DataTable";
import { DataModal } from "./DataModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type TableType = "admin_income" | "worker_income" | "expenses";

export interface AdminIncome {
  id: number;
  tanggal: string;
  nominal: number;
  code?: string;
}

export interface WorkerIncome {
  id: number;
  tanggal: string;
  code: string;
  jobdesk: string;
  worker: string;
  fee: number;
}

export interface Expense {
  id: number;
  tanggal: string;
  nominal: number;
  keterangan?: string;
}

export type DataRecord = AdminIncome | WorkerIncome | Expense;

const tableLabels = {
  admin_income: "Pendapatan Admin",
  worker_income: "Pendapatan Worker", 
  expenses: "Pengeluaran"
};

interface FinancialDashboardProps {
  initialTable?: TableType;
}

export const FinancialDashboard = ({ initialTable = "admin_income" }: FinancialDashboardProps) => {
  const [activeTable, setActiveTable] = useState<TableType>(initialTable);

  // Update active table when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') as TableType;
    if (tab && ['admin_income', 'worker_income', 'expenses'].includes(tab)) {
      setActiveTable(tab);
    }
  }, []);
  const [data, setData] = useState<DataRecord[]>([]);
  const [filteredData, setFilteredData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DataRecord | null>(null);

  // Load data for active table
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from(activeTable)
        .select("*")
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setData(result || []);
      setFilteredData(result || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`${activeTable}_changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activeTable
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTable]);

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(data);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = data.filter((record) => {
      switch (activeTable) {
        case "admin_income":
          const adminRecord = record as AdminIncome;
          return (
            adminRecord.tanggal.toLowerCase().includes(query) ||
            (adminRecord.code && adminRecord.code.toLowerCase().includes(query)) ||
            (adminRecord.nominal && adminRecord.nominal.toString().includes(query))
          );
        case "worker_income":
          const workerRecord = record as WorkerIncome;
          return (
            workerRecord.tanggal.toLowerCase().includes(query) ||
            workerRecord.code.toLowerCase().includes(query) ||
            workerRecord.jobdesk.toLowerCase().includes(query) ||
            workerRecord.worker.toLowerCase().includes(query) ||
            (workerRecord.fee && workerRecord.fee.toString().includes(query))
          );
        case "expenses":
          const expenseRecord = record as Expense;
          return (
            expenseRecord.tanggal.toLowerCase().includes(query) ||
            (expenseRecord.keterangan && expenseRecord.keterangan.toLowerCase().includes(query)) ||
            (expenseRecord.nominal && expenseRecord.nominal.toString().includes(query))
          );
        default:
          return false;
      }
    });
    setFilteredData(filtered);
  }, [searchQuery, data, activeTable]);

  // Reset search when table changes
  useEffect(() => {
    setSearchQuery("");
  }, [activeTable]);

  const handleCreate = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record: DataRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = (record: DataRecord) => {
    setDeletingRecord(record);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRecord) return;

    try {
      const { error } = await supabase
        .from(activeTable)
        .delete()
        .eq("id", deletingRecord.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data berhasil dihapus"
      });
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive"
      });
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingRecord(null);
    }
  };

  const calculateTotal = () => {
    return filteredData.reduce((total, record) => {
      if (activeTable === "worker_income") {
        const fee = (record as WorkerIncome).fee;
        return total + (fee && !isNaN(fee) ? fee : 0);
      }
      const nominal = (record as AdminIncome | Expense).nominal;
      return total + (nominal && !isNaN(nominal) ? nominal : 0);
    }, 0);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar 
          activeTable={activeTable} 
          onTableChange={setActiveTable} 
        />
        
        <main className="flex-1 p-6 bg-gradient-to-br from-background via-background to-secondary/5">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-4xl font-bold text-header">
                Sistem Keuangan
              </h1>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-header">{tableLabels[activeTable]}</h2>
              <Button 
                onClick={handleCreate} 
                className="gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-elegant"
              >
                <Plus className="h-4 w-4" />
                Tambah Data
              </Button>
            </div>

            {/* Search Bar */}
            <Card className="p-6 bg-gradient-to-r from-card to-secondary/5 border-secondary/20 shadow-elegant">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-5 w-5" />
                <Input
                  placeholder={`Cari data ${tableLabels[activeTable].toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-background/80 border-secondary/30 focus:border-secondary focus:ring-secondary/20 transition-all duration-300 text-lg"
                />
              </div>
              {searchQuery && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Menampilkan {filteredData.length} dari {data.length} data
                </div>
              )}
            </Card>

            <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
              <h3 className="text-2xl font-bold mb-3 text-header">
                Total {tableLabels[activeTable]} {searchQuery ? "(Hasil Pencarian)" : ""}
              </h3>
              <p className="text-4xl font-bold text-header">
                Rp {calculateTotal().toLocaleString("id-ID")}
              </p>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  dari {data.length} total data
                </p>
              )}
            </Card>

            <DataTable
              data={filteredData}
              tableType={activeTable}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          <DataModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            tableType={activeTable}
            editingRecord={editingRecord}
          />

          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            recordType={tableLabels[activeTable]}
          />
        </main>
      </div>
    </SidebarProvider>
  );
};