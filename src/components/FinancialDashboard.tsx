import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DataTable } from "./DataTable";
import { DataModal } from "./DataModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { MonthlyRecap } from "./MonthlyRecap";
import { SearchFilters, SearchFilters as SearchFiltersType } from "./SearchFilters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export const FinancialDashboard = () => {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("data");
  const [activeTable, setActiveTable] = useState<TableType>("admin_income");
  const [data, setData] = useState<DataRecord[]>([]);
  const [allData, setAllData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DataRecord | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({});

  // Load data for active table
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from(activeTable)
        .select("*")
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setAllData(result || []);
      applyFilters(result || [], searchFilters);
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

  // Apply search filters
  const applyFilters = (sourceData: DataRecord[], filters: SearchFiltersType) => {
    let filteredData = [...sourceData];

    if (filters.dateFrom) {
      filteredData = filteredData.filter(record => record.tanggal >= filters.dateFrom!);
    }
    
    if (filters.dateTo) {
      filteredData = filteredData.filter(record => record.tanggal <= filters.dateTo!);
    }

    if (filters.month && filters.year) {
      filteredData = filteredData.filter(record => {
        const recordDate = new Date(record.tanggal);
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, '0');
        const recordYear = recordDate.getFullYear().toString();
        return recordMonth === filters.month && recordYear === filters.year;
      });
    } else if (filters.month) {
      filteredData = filteredData.filter(record => {
        const recordDate = new Date(record.tanggal);
        const recordMonth = (recordDate.getMonth() + 1).toString().padStart(2, '0');
        return recordMonth === filters.month;
      });
    } else if (filters.year) {
      filteredData = filteredData.filter(record => {
        const recordDate = new Date(record.tanggal);
        const recordYear = recordDate.getFullYear().toString();
        return recordYear === filters.year;
      });
    }

    if (filters.worker && activeTable === "worker_income") {
      filteredData = filteredData.filter(record => 
        (record as WorkerIncome).worker.toLowerCase().includes(filters.worker!.toLowerCase())
      );
    }

    if (filters.code && (activeTable === "admin_income" || activeTable === "worker_income")) {
      filteredData = filteredData.filter(record => {
        const code = activeTable === "admin_income" 
          ? (record as AdminIncome).code 
          : (record as WorkerIncome).code;
        return code?.toLowerCase().includes(filters.code!.toLowerCase());
      });
    }

    if (filters.keterangan && activeTable === "expenses") {
      filteredData = filteredData.filter(record => 
        (record as Expense).keterangan?.toLowerCase().includes(filters.keterangan!.toLowerCase())
      );
    }

    if (filters.jobdesk && activeTable === "worker_income") {
      filteredData = filteredData.filter(record => 
        (record as WorkerIncome).jobdesk.toLowerCase().includes(filters.jobdesk!.toLowerCase())
      );
    }

    setData(filteredData);
  };

  const handleSearch = (filters: SearchFiltersType) => {
    setSearchFilters(filters);
    applyFilters(allData, filters);
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
    return data.reduce((total, record) => {
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
        
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                Sistem Keuangan
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {profile?.role === 'superadmin' ? 'Super Admin' : 'User'}: {profile?.username}
              </span>
              <Button 
                onClick={signOut}
                variant="outline"
                size="sm"
                className="border-secondary/30 hover:bg-secondary/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Kelola Data
              </TabsTrigger>
              <TabsTrigger value="recap" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Rekap Bulanan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{tableLabels[activeTable]}</h2>
                {profile?.role === 'superadmin' && (
                  <Button onClick={handleCreate} className="gap-2 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90">
                    <Plus className="h-4 w-4" />
                    Tambah Data
                  </Button>
                )}
              </div>

              <SearchFilters 
                tableType={activeTable}
                onSearch={handleSearch}
              />

              <Card className="p-4 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-card">
                <h3 className="text-lg font-semibold mb-2 text-secondary">Total {tableLabels[activeTable]}</h3>
                <p className="text-3xl font-bold text-secondary">
                  Rp {calculateTotal().toLocaleString("id-ID")}
                </p>
              </Card>

              <DataTable
                data={data}
                tableType={activeTable}
                loading={loading}
                onEdit={profile?.role === 'superadmin' ? handleEdit : undefined}
                onDelete={profile?.role === 'superadmin' ? handleDelete : undefined}
              />
            </TabsContent>

            <TabsContent value="recap" className="space-y-6">
              <MonthlyRecap />
            </TabsContent>
          </Tabs>

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