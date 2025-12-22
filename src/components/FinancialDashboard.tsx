import { useState, useEffect, useMemo, useCallback } from "react";
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
import { debounce } from "@/lib/debounce";

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
    
    if (userRole === 'public' && tab && !['worker_income'].includes(tab)) {
      // Public role: only worker_income (salary_withdrawals handled in separate pages)
      window.history.replaceState({}, '', '/?tab=worker_income');
      setActiveTable('worker_income');
      return;
    }
    
    if (userRole === 'admin' && tab && !['worker_income'].includes(tab)) {
      // Admin: only worker_income (admin_income requires admin_keuangan or super_admin)
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
  }, [user, userRole, isAdmin]);
  const [data, setData] = useState<DataRecord[]>([]);
  const [filteredData, setFilteredData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    selectedCode: "all",
    selectedWorker: "all",
    selectedMonth: "all",
    selectedRole: "all",
    selectedStatus: "all"
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryData, setSummaryData] = useState<{ totalCount: number; totalNominal: number }>({
    totalCount: 0,
    totalNominal: 0
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<DataRecord | null>(null);

  // Helper function to normalize worker names
  const normalizeWorkerName = (name: string): string => {
    if (!name || !name.trim()) return '(Unknown)';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  // Helper to get current month date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${lastDay}`
    };
  };

  // Load data for active table with server-side pagination
  const loadData = async () => {
    setLoading(true);
    try {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;
      const monthRange = getCurrentMonthRange();

      // Special handling for workers table to normalize data
      if (activeTable === 'workers') {
        // Parallel queries: paginated data + total count summary
        const [paginatedResult, summaryResult] = await Promise.all([
          supabase
            .from('workers')
            .select('id, nama, rekening, nomor_wa, role, status, created_at, updated_at', { count: 'exact' })
            .order('id', { ascending: false })
            .range(startIndex, endIndex),
          supabase
            .from('workers')
            .select('*', { count: 'exact', head: true })
        ]);

        if (paginatedResult.error) {
          console.error("Supabase error:", paginatedResult.error);
          throw paginatedResult.error;
        }

        // Normalize worker data to handle empty strings
        const normalized = (paginatedResult.data || []).map(r => ({
          ...r,
          nama: (r.nama || '').trim() || '(Tanpa Nama)',
          rekening: (r.rekening || '').trim() || '-',
          nomor_wa: (r.nomor_wa || '').trim() || '-',
          role: (r.role || '').trim() || '-',
          status: (r.status || '').trim() || 'non aktif',
        }));

        setData(normalized);
        setFilteredData(normalized);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({
          totalCount: summaryResult.count || 0,
          totalNominal: 0
        });
      } else if (activeTable === 'admin_income') {
        // Parallel queries: paginated data + current month summary
        const [paginatedResult, summaryResult] = await Promise.all([
          supabase
            .from('admin_income')
            .select('*', { count: 'exact' })
            .order('tanggal', { ascending: false })
            .range(startIndex, endIndex),
          supabase
            .from('admin_income')
            .select('nominal')
            .gte('tanggal', monthRange.start)
            .lte('tanggal', monthRange.end)
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

        // Normalize admin_income data
        const normalized = (paginatedResult.data || []).map(r => ({
          ...r,
          code: (r.code || '').trim() || null,
          nominal: r.nominal || 0,
        }));

        const totalNominal = (summaryResult.data || []).reduce(
          (sum, r) => sum + Number(r.nominal || 0), 0
        );

        setData(normalized);
        setFilteredData(normalized);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });
      } else if (activeTable === 'worker_income') {
        // Parallel queries: paginated data + current month summary
        const [paginatedResult, summaryResult] = await Promise.all([
          supabase
            .from('worker_income')
            .select('*', { count: 'exact' })
            .order('tanggal', { ascending: false })
            .range(startIndex, endIndex),
          supabase
            .from('worker_income')
            .select('fee')
            .gte('tanggal', monthRange.start)
            .lte('tanggal', monthRange.end)
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

        // Normalize worker_income data with case-insensitive worker names
        const normalized = (paginatedResult.data || []).map(r => ({
          ...r,
          code: (r.code || '').trim() || 'NO_CODE',
          jobdesk: (r.jobdesk || '').trim() || '(Tanpa jobdesk)',
          worker: normalizeWorkerName(r.worker),
          fee: r.fee || 0,
        }));

        const totalNominal = (summaryResult.data || []).reduce(
          (sum, r) => sum + Number(r.fee || 0), 0
        );

        setData(normalized);
        setFilteredData(normalized);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });
      } else {
        // Standard fetch for other tables (expenses) with summary
        const [paginatedResult, summaryResult] = await Promise.all([
          supabase
            .from(activeTable)
            .select("*", { count: 'exact' })
            .order("tanggal", { ascending: false })
            .range(startIndex, endIndex),
          supabase
            .from('expenses')
            .select('nominal')
            .gte('tanggal', monthRange.start)
            .lte('tanggal', monthRange.end)
        ]);

        if (paginatedResult.error) {
          console.error("Supabase error:", paginatedResult.error);
          throw paginatedResult.error;
        }

        const totalNominal = (summaryResult.data || []).reduce(
          (sum, r) => sum + Number(r.nominal || 0), 0
        );
        
        setData(paginatedResult.data || []);
        setFilteredData(paginatedResult.data || []);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      
      // Provide specific error messages
      let errorMessage = "Gagal memuat data";
      if (error?.message?.includes("JWT")) {
        errorMessage = "Sesi Anda telah berakhir. Silakan login kembali.";
      } else if (error?.message?.includes("permission")) {
        errorMessage = "Anda tidak memiliki akses ke data ini";
      } else if (error?.code === "PGRST116") {
        errorMessage = "Data tidak ditemukan atau Anda tidak memiliki akses";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription with debouncing
  useEffect(() => {
    loadData();

    // Create debounced version of loadData to prevent rapid re-fetches
    const debouncedLoadData = debounce(() => {
      loadData();
    }, 300);

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
          debouncedLoadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTable, currentPage]);

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
        const workerName = (record as WorkerIncome).worker || '';
        return workerName.toLowerCase() === filters.selectedWorker.toLowerCase();
      });
    }

    if (filters.selectedMonth && filters.selectedMonth !== "all") {
      filtered = filtered.filter((record) => {
        const date = new Date((record as any).tanggal);
        const recordMonthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
      selectedMonth: "all",
      selectedRole: "all",
      selectedStatus: "all"
    });
    setCurrentPage(1);
  }, [activeTable]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  // Calculate pagination data - use server-side count
  const totalItems = totalCount;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  // Data is already paginated from server, no need to slice
  const currentData = filteredData;

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

  // Check if any filters are applied (excluding search)
  const hasActiveFilters = filters.selectedCode !== "all" || 
                    filters.selectedWorker !== "all" || 
                    filters.selectedMonth !== "all" || 
                    filters.selectedRole !== "all" || 
                    filters.selectedStatus !== "all" ||
                    searchQuery.trim() !== "";

  const calculateFilteredTotal = () => {
    // Calculate from filtered data only when filters are active
    return filteredData.reduce((total, record) => {
      if (activeTable === "worker_income") {
        const fee = (record as WorkerIncome).fee;
        return total + (fee && !isNaN(fee) ? fee : 0);
      }
      if (activeTable === "workers") {
        return total + 1; // Count workers
      }
      const nominal = (record as AdminIncome | Expense).nominal;
      return total + (nominal && !isNaN(nominal) ? nominal : 0);
    }, 0);
  };

  const getSummaryDisplay = () => {
    if (activeTable === "workers") {
      // For workers: show total count from database
      return `${summaryData.totalCount} Worker`;
    }
    // For income/expenses: show total nominal from current month
    return `Rp ${summaryData.totalNominal.toLocaleString("id-ID")}`;
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
                    {userRole === 'super_admin' ? 'Super Admin' : 
                     userRole === 'admin' ? 'Admin' : 
                     userRole === 'admin_keuangan' ? 'Admin Keuangan' : 
                     userRole === 'public' ? 'Public' : 'User'} Mode
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


            {/* Show total for worker_income in public mode only when both month and worker filters are selected */}
            {!(activeTable === "worker_income" && !isAdmin && !(filters.selectedMonth !== "all" && filters.selectedWorker !== "all")) && (
              <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
                <h3 className="text-2xl font-bold mb-3 text-header">
                  Total {tableLabels[activeTable]} {
                    hasActiveFilters 
                      ? "(Hasil Filter)" 
                      : activeTable !== "workers" ? "(Bulan Ini)" : ""
                  }
                </h3>
                <p className="text-4xl font-bold text-header">
                  {hasActiveFilters 
                    ? (activeTable === "workers" 
                        ? `${filteredData.length} Worker`
                        : `Rp ${calculateFilteredTotal().toLocaleString("id-ID")}`)
                    : getSummaryDisplay()
                  }
                </p>
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground mt-2">
                    dari {getSummaryDisplay()} total {activeTable === "workers" ? "" : "bulan ini"}
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