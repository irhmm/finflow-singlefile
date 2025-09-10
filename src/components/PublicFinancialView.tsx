import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogIn } from "lucide-react";
import { DataTable } from "./DataTable";
import { SearchFilters, SearchFilters as SearchFiltersType } from "./SearchFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { TableType, DataRecord, AdminIncome, WorkerIncome, Expense } from "./FinancialDashboard";

const tableLabels = {
  admin_income: "Pendapatan Admin",
  worker_income: "Pendapatan Worker", 
  expenses: "Pengeluaran"
};

interface PublicFinancialViewProps {
  onLoginClick: () => void;
}

export const PublicFinancialView = ({ onLoginClick }: PublicFinancialViewProps) => {
  const [activeTable, setActiveTable] = useState<TableType>("admin_income");
  const [data, setData] = useState<DataRecord[]>([]);
  const [allData, setAllData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      <header className="border-b border-secondary/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            Sistem Keuangan
          </h1>
          <Button 
            onClick={onLoginClick}
            className="gap-2 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90"
          >
            <LogIn className="h-4 w-4" />
            Login Admin
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-xl text-muted-foreground mb-2">
            Laporan Keuangan Publik
          </h2>
          <p className="text-sm text-muted-foreground">
            Lihat ringkasan data keuangan terkini
          </p>
        </div>

        <div className="space-y-6">
          <Tabs value={activeTable} onValueChange={(value) => setActiveTable(value as TableType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin_income">Pendapatan Admin</TabsTrigger>
              <TabsTrigger value="worker_income">Pendapatan Worker</TabsTrigger>
              <TabsTrigger value="expenses">Pengeluaran</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTable} className="space-y-6">
              <SearchFilters 
                tableType={activeTable}
                onSearch={handleSearch}
              />

              <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/5 border-secondary/20 shadow-xl">
                <h3 className="text-lg font-semibold mb-2 text-secondary">
                  Total {tableLabels[activeTable]}
                </h3>
                <p className="text-3xl font-bold text-secondary">
                  Rp {calculateTotal().toLocaleString("id-ID")}
                </p>
              </Card>

              <Card className="p-6 border-secondary/20 shadow-xl">
                <DataTable
                  data={data}
                  tableType={activeTable}
                  loading={loading}
                />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};