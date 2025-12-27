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
    
    if (userRole === 'admin' && tab && !['worker_income', 'admin_income'].includes(tab)) {
      // Admin: worker_income and admin_income (read-only)
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
  
  // Filter options from database (not from paginated data)
  const [filterOptions, setFilterOptions] = useState<{
    codes: string[];
    workers: string[];
    months: { value: string; label: string }[];
  }>({
    codes: [],
    workers: [],
    months: []
  });

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

  // Load filter options from database (separate from paginated data)
  const loadFilterOptions = async () => {
    try {
      if (activeTable === 'worker_income') {
        // Fetch all unique codes, workers, and months from database
        const [codesRes, workersRes, monthsRes] = await Promise.all([
          supabase.from('worker_income').select('code'),
          supabase.from('worker_income').select('worker'),
          supabase.from('worker_income').select('tanggal')
        ]);

        // Extract unique codes
        const codes = [...new Set(
          (codesRes.data || [])
            .map(r => (r.code || '').trim())
            .filter(Boolean)
        )].sort();

        // Extract unique workers with proper casing
        const workerMap = new Map<string, string>();
        (workersRes.data || []).forEach(r => {
          const worker = (r.worker || '').trim();
          if (worker) {
            const normalizedKey = worker.toLowerCase();
            if (!workerMap.has(normalizedKey)) {
              workerMap.set(normalizedKey, normalizeWorkerName(worker));
            }
          }
        });
        const workers = Array.from(workerMap.values()).sort();

        // Extract unique months
        const monthSet = new Set<string>();
        (monthsRes.data || []).forEach(r => {
          if (r.tanggal) {
            const d = new Date(r.tanggal);
            monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }
        });
        const months = Array.from(monthSet)
          .sort()
          .reverse()
          .map(m => {
            const [year, month] = m.split('-');
            return {
              value: m,
              label: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { 
                month: 'long', 
                year: 'numeric' 
              })
            };
          });

        setFilterOptions({ codes, workers, months });
      } else if (activeTable === 'admin_income') {
        const [codesRes, monthsRes] = await Promise.all([
          supabase.from('admin_income').select('code'),
          supabase.from('admin_income').select('tanggal')
        ]);

        const codes = [...new Set(
          (codesRes.data || [])
            .map(r => (r.code || '').trim())
            .filter(Boolean)
        )].sort();

        const monthSet = new Set<string>();
        (monthsRes.data || []).forEach(r => {
          if (r.tanggal) {
            const d = new Date(r.tanggal);
            monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }
        });
        const months = Array.from(monthSet)
          .sort()
          .reverse()
          .map(m => {
            const [year, month] = m.split('-');
            return {
              value: m,
              label: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { 
                month: 'long', 
                year: 'numeric' 
              })
            };
          });

        setFilterOptions({ codes, workers: [], months });
      } else if (activeTable === 'expenses') {
        const monthsRes = await supabase.from('expenses').select('tanggal');

        const monthSet = new Set<string>();
        (monthsRes.data || []).forEach(r => {
          if (r.tanggal) {
            const d = new Date(r.tanggal);
            monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }
        });
        const months = Array.from(monthSet)
          .sort()
          .reverse()
          .map(m => {
            const [year, month] = m.split('-');
            return {
              value: m,
              label: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', { 
                month: 'long', 
                year: 'numeric' 
              })
            };
          });

        setFilterOptions({ codes: [], workers: [], months });
      }
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  // Load filter options when table changes
  useEffect(() => {
    loadFilterOptions();
  }, [activeTable]);

  // Load data for active table with server-side pagination AND filtering
  const loadData = async () => {
    setLoading(true);
    try {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;
      const monthRange = getCurrentMonthRange();

      if (activeTable === 'workers') {
        let query = supabase
          .from('workers')
          .select('id, nama, rekening, nomor_wa, role, status, created_at, updated_at', { count: 'exact' });

        // Apply server-side filters
        if (filters.selectedRole && filters.selectedRole !== 'all') {
          query = query.ilike('role', filters.selectedRole);
        }
        if (filters.selectedStatus && filters.selectedStatus !== 'all') {
          query = query.ilike('status', filters.selectedStatus);
        }
        if (searchQuery.trim()) {
          query = query.or(`nama.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%,status.ilike.%${searchQuery}%`);
        }

        // Apply pagination
        query = query.order('id', { ascending: false }).range(startIndex, endIndex);

        const [paginatedResult, summaryResult] = await Promise.all([
          query,
          supabase.from('workers').select('*', { count: 'exact', head: true })
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

        const normalized = (paginatedResult.data || []).map(r => ({
          ...r,
          nama: (r.nama || '').trim() || '(Tanpa Nama)',
          rekening: (r.rekening || '').trim() || '-',
          nomor_wa: (r.nomor_wa || '').trim() || '-',
          role: (r.role || '').trim() || '-',
          status: (r.status || '').trim() || 'non aktif',
        }));

        setData(normalized);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: summaryResult.count || 0, totalNominal: 0 });

      } else if (activeTable === 'admin_income') {
        let query = supabase
          .from('admin_income')
          .select('*', { count: 'exact' });

        // Apply server-side filters
        if (filters.selectedCode && filters.selectedCode !== 'all') {
          query = query.eq('code', filters.selectedCode);
        }
        if (filters.selectedMonth && filters.selectedMonth !== 'all') {
          const [year, month] = filters.selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        }
        if (searchQuery.trim()) {
          query = query.or(`code.ilike.%${searchQuery}%,nominal.ilike.%${searchQuery}%`);
        }

        // Apply pagination
        query = query.order('tanggal', { ascending: false }).range(startIndex, endIndex);

        const [paginatedResult, summaryResult] = await Promise.all([
          query,
          supabase
            .from('admin_income')
            .select('nominal')
            .gte('tanggal', monthRange.start)
            .lte('tanggal', monthRange.end)
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

        const normalized = (paginatedResult.data || []).map(r => ({
          ...r,
          code: (r.code || '').trim() || null,
          nominal: r.nominal || 0,
        }));

        const totalNominal = (summaryResult.data || []).reduce(
          (sum, r) => sum + Number(r.nominal || 0), 0
        );

        setData(normalized);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });

      } else if (activeTable === 'worker_income') {
        let query = supabase
          .from('worker_income')
          .select('*', { count: 'exact' });

        // Apply server-side filters
        if (filters.selectedCode && filters.selectedCode !== 'all') {
          query = query.eq('code', filters.selectedCode);
        }
        if (filters.selectedWorker && filters.selectedWorker !== 'all') {
          query = query.ilike('worker', filters.selectedWorker);
        }
        if (filters.selectedMonth && filters.selectedMonth !== 'all') {
          const [year, month] = filters.selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        }
        if (searchQuery.trim()) {
          query = query.or(`code.ilike.%${searchQuery}%,worker.ilike.%${searchQuery}%,jobdesk.ilike.%${searchQuery}%`);
        }

        // Apply pagination
        query = query.order('tanggal', { ascending: false }).range(startIndex, endIndex);

        // Also calculate filtered total for summary
        let summaryQuery = supabase
          .from('worker_income')
          .select('fee');

        // Apply same filters to summary query
        if (filters.selectedCode && filters.selectedCode !== 'all') {
          summaryQuery = summaryQuery.eq('code', filters.selectedCode);
        }
        if (filters.selectedWorker && filters.selectedWorker !== 'all') {
          summaryQuery = summaryQuery.ilike('worker', filters.selectedWorker);
        }
        if (filters.selectedMonth && filters.selectedMonth !== 'all') {
          const [year, month] = filters.selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          summaryQuery = summaryQuery.gte('tanggal', startDate).lte('tanggal', endDate);
        } else {
          // If no month filter, use current month for summary
          summaryQuery = summaryQuery.gte('tanggal', monthRange.start).lte('tanggal', monthRange.end);
        }
        if (searchQuery.trim()) {
          summaryQuery = summaryQuery.or(`code.ilike.%${searchQuery}%,worker.ilike.%${searchQuery}%,jobdesk.ilike.%${searchQuery}%`);
        }

        const [paginatedResult, summaryResult] = await Promise.all([
          query,
          summaryQuery
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

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
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });

      } else {
        // expenses table
        let query = supabase
          .from('expenses')
          .select('*', { count: 'exact' });

        // Apply server-side filters
        if (filters.selectedMonth && filters.selectedMonth !== 'all') {
          const [year, month] = filters.selectedMonth.split('-');
          const startDate = `${year}-${month}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
          query = query.gte('tanggal', startDate).lte('tanggal', endDate);
        }
        if (searchQuery.trim()) {
          query = query.or(`keterangan.ilike.%${searchQuery}%`);
        }

        // Apply pagination
        query = query.order('tanggal', { ascending: false }).range(startIndex, endIndex);

        const [paginatedResult, summaryResult] = await Promise.all([
          query,
          supabase
            .from('expenses')
            .select('nominal')
            .gte('tanggal', monthRange.start)
            .lte('tanggal', monthRange.end)
        ]);

        if (paginatedResult.error) throw paginatedResult.error;

        const totalNominal = (summaryResult.data || []).reduce(
          (sum, r) => sum + Number(r.nominal || 0), 0
        );

        setData(paginatedResult.data || []);
        setTotalCount(paginatedResult.count || 0);
        setSummaryData({ totalCount: 0, totalNominal });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      
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
  // Include filters and searchQuery as dependencies
  useEffect(() => {
    loadData();

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
  }, [activeTable, currentPage, filters, searchQuery]);

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
  const currentData = data;

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

  // Check if any filters are applied
  const hasActiveFilters = filters.selectedCode !== "all" || 
                    filters.selectedWorker !== "all" || 
                    filters.selectedMonth !== "all" || 
                    filters.selectedRole !== "all" || 
                    filters.selectedStatus !== "all" ||
                    searchQuery.trim() !== "";

  const getSummaryDisplay = () => {
    if (activeTable === "workers") {
      return `${summaryData.totalCount} Worker`;
    }
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

            {/* Hide total card for:
                - worker_income in public mode unless both month and worker filters are selected
                - admin_income when user role is 'admin' (read-only mode)
                - worker_income when user role is 'admin' (show if filter/search active)
            */}
            {!(activeTable === "worker_income" && !isAdmin && !(filters.selectedMonth !== "all" && filters.selectedWorker !== "all")) && 
             !(activeTable === "admin_income" && userRole === 'admin') && 
             !(activeTable === "worker_income" && userRole === 'admin' && !hasActiveFilters && !searchQuery) && (
              <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-elegant">
                <h3 className="text-2xl font-bold mb-3 text-header">
                  Total {tableLabels[activeTable]} {
                    hasActiveFilters 
                      ? "(Hasil Filter)" 
                      : activeTable !== "workers" ? "(Bulan Ini)" : ""
                  }
                </h3>
                <p className="text-4xl font-bold text-header">
                  {getSummaryDisplay()}
                </p>
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
              filteredData={data}
              availableCodes={filterOptions.codes}
              availableWorkers={filterOptions.workers}
              availableMonths={filterOptions.months}
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
