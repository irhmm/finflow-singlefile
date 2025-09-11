import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { DataTable } from "./DataTable";
import { DataModal } from "./DataModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { FilterOptions } from "./TableFilters";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, LogIn, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export type TableType = "admin_income" | "worker_income" | "expenses" | "workers";

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

export interface Worker {
  id: number;
  nama: string;
  rekening?: string;
  nomor_wa?: string;
  role?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export type DataRecord = AdminIncome | WorkerIncome | Expense | Worker;

const tableLabels = {
  admin_income: "Pendapatan Admin",
  worker_income: "Pendapatan Worker", 
  expenses: "Pengeluaran",
  workers: "Data Worker"
};

interface FinancialDashboardProps {
  initialTable?: TableType;
}

export const FinancialDashboard = ({ initialTable = "worker_income" }: FinancialDashboardProps) => {
  const { user, userRole, isAdmin, isSuperAdmin, canEdit, signOut } = useAuth();
  const [activeTable, setActiveTable] = useState<TableType>(initialTable);

  // Update active table when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') as TableType;
    
    // Access control based on role
    if (!user && tab && tab !== 'worker_income') {
      // Anonymous users: only worker_income
      window.history.replaceState({}, '', '/?tab=worker_income');
      setActiveTable('worker_income');
      return;
    }
    
    if (userRole === 'admin' && tab && !['worker_income', 'admin_income'].includes(tab)) {
      // Admin: only worker_income and admin_income
      window.history.replaceState({}, '', '/?tab=worker_income');
      setActiveTable('worker_income');
      return;
    }
    
    if (tab && ['admin_income', 'worker_income', 'expenses', 'workers'].includes(tab)) {
      setActiveTable(tab);
    } else {
      // Default table based on user role
      const defaultTable = isAdmin ? "admin_income" : "worker_income";
      setActiveTable(defaultTable);
    }
  }, [isAdmin]);
  const [data, setData] = useState<DataRecord[]>([]);
  const [filteredData, setFilteredData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    selectedCode: "all",
    selectedWorker: "all",
    selectedMonth: "all"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
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
        .order(activeTable === "workers" ? "created_at" : "tanggal", { ascending: false });

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

  // Advanced filtering functionality
  useEffect(() => {
    let filtered = [...data];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((record) => {
        switch (activeTable) {
          case "admin_income":
            const adminRecord = record as AdminIncome;
            return (
              (adminRecord.tanggal && adminRecord.tanggal.toLowerCase().includes(query)) ||
              (adminRecord.code && adminRecord.code.toLowerCase().includes(query)) ||
              (adminRecord.nominal && adminRecord.nominal.toString().includes(query))
            );
          case "worker_income":
            const workerIncomeRecord = record as WorkerIncome;
            return (
              (workerIncomeRecord.tanggal && workerIncomeRecord.tanggal.toLowerCase().includes(query)) ||
              (workerIncomeRecord.code && workerIncomeRecord.code.toLowerCase().includes(query)) ||
              (workerIncomeRecord.jobdesk && workerIncomeRecord.jobdesk.toLowerCase().includes(query)) ||
              (workerIncomeRecord.worker && workerIncomeRecord.worker.toLowerCase().includes(query)) ||
              (workerIncomeRecord.fee && workerIncomeRecord.fee.toString().includes(query))
            );
          case "expenses":
            const expenseRecord = record as Expense;
            return (
              (expenseRecord.tanggal && expenseRecord.tanggal.toLowerCase().includes(query)) ||
              (expenseRecord.keterangan && expenseRecord.keterangan.toLowerCase().includes(query)) ||
              (expenseRecord.nominal && expenseRecord.nominal.toString().includes(query))
            );
          case "workers":
            const dataWorkerRecord = record as Worker;
            return (
              (dataWorkerRecord.nama && dataWorkerRecord.nama.toLowerCase().includes(query)) ||
              (dataWorkerRecord.rekening && dataWorkerRecord.rekening.toLowerCase().includes(query)) ||
              (dataWorkerRecord.nomor_wa && dataWorkerRecord.nomor_wa.toLowerCase().includes(query)) ||
              (dataWorkerRecord.role && dataWorkerRecord.role.toLowerCase().includes(query)) ||
              (dataWorkerRecord.status && dataWorkerRecord.status.toLowerCase().includes(query))
            );
          default:
            return false;
        }
      });
    }

    // Apply filters
    if (filters.selectedCode && filters.selectedCode !== "all") {
      filtered = filtered.filter((record) => {
        if (activeTable === "admin_income") {
          return (record as AdminIncome).code === filters.selectedCode;
        } else if (activeTable === "worker_income") {
          return (record as WorkerIncome).code === filters.selectedCode;
        }
        return true;
      });
    }

    if (filters.selectedWorker && filters.selectedWorker !== "all" && activeTable === "worker_income") {
      filtered = filtered.filter((record) => {
        return (record as WorkerIncome).worker === filters.selectedWorker;
      });
    }

    if (filters.selectedMonth && filters.selectedMonth !== "all") {
      filtered = filtered.filter((record) => {
        const date = new Date((record as any).tanggal);
        const recordMonthYear = `${date.getFullYear()}-${date.getMonth()}`;
        return recordMonthYear === filters.selectedMonth;
      });
    }

    setFilteredData(filtered);
  }, [searchQuery, filters, data, activeTable]);

  // Reset search and filters when table changes
  useEffect(() => {
    setSearchQuery("");
    setFilters({
      searchQuery: "",
      selectedCode: "all",
      selectedWorker: "all",
      selectedMonth: "all"
    });
    setCurrentPage(1);
  }, [activeTable]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Calculate pagination data
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
    if (activeTable === "workers") {
      return filteredData.length; // Show count for workers instead of total
    }
    
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
            <div className="flex items-center gap-2">
              {!user ? (
                <Button 
                  onClick={() => window.location.href = '/admin-login'} 
                  className="gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-elegant"
                >
                  <LogIn className="h-4 w-4" />
                  Login as Admin
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Public'} Mode
                  </span>
                  <Button 
                    onClick={signOut}
                    variant="outline" 
                    className="gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-header">{tableLabels[activeTable]}</h2>
              {canEdit && (
                <Button 
                  onClick={handleCreate} 
                  className="gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-elegant"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Data
                </Button>
              )}
            </div>


            {/* Hide total for worker_income in public mode */}
            {!(activeTable === "worker_income" && !isAdmin) && (
              <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
                <h3 className="text-2xl font-bold mb-3 text-header">
                  {activeTable === "workers" ? "Total" : "Total"} {tableLabels[activeTable]} {(searchQuery || (filters.selectedCode !== "all") || (filters.selectedWorker !== "all") || (filters.selectedMonth !== "all")) ? "(Hasil Filter)" : ""}
                </h3>
                <p className="text-4xl font-bold text-header">
                  {activeTable === "workers" 
                    ? `${calculateTotal()} Worker`
                    : `Rp ${calculateTotal().toLocaleString("id-ID")}`
                  }
                </p>
                {(searchQuery || (filters.selectedCode !== "all") || (filters.selectedWorker !== "all") || (filters.selectedMonth !== "all")) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    dari {data.length} total data
                  </p>
                )}
              </Card>
            )}

        <DataTable
          data={currentData}
          tableType={activeTable}
          loading={loading}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canEdit ? handleDelete : undefined}
          isReadOnly={!canEdit}
          totalItems={totalItems}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          filteredData={filteredData}
        />

          </div>

          {canEdit && (
            <>
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
            </>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};