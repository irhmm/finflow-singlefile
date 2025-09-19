import { useState } from "react";
import { Search, Filter, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';

export interface FilterOptions {
  searchQuery: string;
  selectedCode: string;
  selectedWorker: string;
  selectedMonth: string;
  selectedRole: string;
  selectedStatus: string;
}

interface TableFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableCodes: string[];
  availableWorkers: string[];
  availableMonths: { value: string; label: string; }[];
  exportData: any[];
  tableType: "admin_income" | "worker_income" | "workers";
  className?: string;
}

export function TableFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  availableCodes,
  availableWorkers,
  availableMonths,
  exportData,
  tableType,
  className = ""
}: TableFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const activeFiltersCount = [
    tableType === "admin_income" && filters.selectedCode !== "all" ? filters.selectedCode : "",
    tableType === "worker_income" && filters.selectedWorker !== "all" ? filters.selectedWorker : "",
    tableType === "workers" && filters.selectedRole !== "all" ? filters.selectedRole : "",
    tableType === "workers" && filters.selectedStatus !== "all" ? filters.selectedStatus : "",
    tableType !== "workers" && filters.selectedMonth !== "all" ? filters.selectedMonth : ""
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: "",
      selectedCode: "all",
      selectedWorker: "all",
      selectedMonth: "all",
      selectedRole: "all",
      selectedStatus: "all"
    });
    onSearchChange("");
  };

  const exportToExcel = () => {
    if (exportData.length === 0) return;

    let filename = "";
    let worksheetData: any[] = [];

    if (tableType === "admin_income") {
      filename = `admin_income_${new Date().toISOString().split('T')[0]}.xlsx`;
      worksheetData = exportData.map((item: any, index: number) => ({
        "No": index + 1,
        "Tanggal": new Date(item.tanggal).toLocaleDateString("id-ID"),
        "Code": item.code || "-",
        "Nominal": `Rp ${item.nominal.toLocaleString("id-ID")}`
      }));
    } else if (tableType === "workers") {
      filename = `workers_${new Date().toISOString().split('T')[0]}.xlsx`;
      worksheetData = exportData.map((item: any, index: number) => ({
        "No": index + 1,
        "Nama": item.nama,
        "Role": item.role || "-",
        "Status": item.status,
        "Rekening": item.rekening || "-",
        "Nomor WA": item.nomor_wa || "-"
      }));
    } else {
      filename = `worker_income_${new Date().toISOString().split('T')[0]}.xlsx`;
      worksheetData = exportData.map((item: any, index: number) => ({
        "No": index + 1,
        "Tanggal": new Date(item.tanggal).toLocaleDateString("id-ID"),
        "Code": item.code,
        "Jobdesk": item.jobdesk,
        "Worker": item.worker,
        "Fee": `Rp ${item.fee.toLocaleString("id-ID")}`
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // Set column widths
    const colWidths = tableType === "admin_income" 
      ? [{ wch: 5 }, { wch: 15 }, { wch: 20 }, { wch: 20 }]
      : tableType === "workers"
      ? [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 }]
      : [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
    
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tableType === "admin_income" ? "Cari berdasarkan code..." : tableType === "worker_income" ? "Cari berdasarkan code, jobdesk, atau worker..." : "Cari berdasarkan nama, role, atau status..."}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-4 h-11 border-border/50 focus:border-[#3b82f6] focus:ring-[#3b82f6] transition-all duration-200"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Filter Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className={`h-11 gap-2 border-border/50 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-all duration-200 ${
                activeFiltersCount > 0 ? "border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/5" : ""
              }`}
            >
              <Filter className="h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-[#3b82f6] text-white text-xs px-2 py-0.5">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 shadow-lg border border-border/50" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filter Data</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Month Filter - Not for workers */}
              {tableType !== "workers" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Bulan</label>
                  <Select
                    value={filters.selectedMonth}
                    onValueChange={(value) => onFiltersChange({ ...filters, selectedMonth: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Bulan</SelectItem>
                      {availableMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Code Filter - Only for admin_income */}
              {tableType === "admin_income" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Code</label>
                  <Select
                    value={filters.selectedCode}
                    onValueChange={(value) => onFiltersChange({ ...filters, selectedCode: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Code</SelectItem>
                      {availableCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Worker Filter - Only for worker_income */}
              {tableType === "worker_income" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Worker</label>
                  <Select
                    value={filters.selectedWorker}
                    onValueChange={(value) => onFiltersChange({ ...filters, selectedWorker: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih worker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Worker</SelectItem>
                      {availableWorkers.map((worker) => (
                        <SelectItem key={worker} value={worker}>
                          {worker}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role Filter - Only for workers */}
              {tableType === "workers" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Select
                    value={filters.selectedRole}
                    onValueChange={(value) => onFiltersChange({ ...filters, selectedRole: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Role</SelectItem>
                      {Array.from(new Set(exportData.map((worker: any) => worker.role).filter(Boolean))).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter - Only for workers */}
              {tableType === "workers" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Select
                    value={filters.selectedStatus}
                    onValueChange={(value) => onFiltersChange({ ...filters, selectedStatus: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      {Array.from(new Set(exportData.map((worker: any) => worker.status).filter(Boolean))).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Button */}
        <Button
          onClick={exportToExcel}
          variant="default"
          size="default"
          className="h-11 gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
          disabled={exportData.length === 0}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}