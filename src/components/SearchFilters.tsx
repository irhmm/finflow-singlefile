import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { TableType } from './FinancialDashboard';

interface SearchFiltersProps {
  tableType: TableType;
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  dateFrom?: string;
  dateTo?: string;
  month?: string;
  year?: string;
  worker?: string;
  code?: string;
  keterangan?: string;
  jobdesk?: string;
}

export function SearchFilters({ tableType, onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({});
    onSearch({});
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  return (
    <Card className="mb-6 border-secondary/20 shadow-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">Tanggal Dari</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dateTo">Tanggal Sampai</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Bulan</Label>
            <Select value={filters.month || ''} onValueChange={(value) => handleFilterChange('month', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Tahun</Label>
            <Select value={filters.year || ''} onValueChange={(value) => handleFilterChange('year', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tableType === "worker_income" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="worker">Worker</Label>
                <Input
                  id="worker"
                  placeholder="Nama worker"
                  value={filters.worker || ''}
                  onChange={(e) => handleFilterChange('worker', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jobdesk">Jobdesk</Label>
                <Input
                  id="jobdesk"
                  placeholder="Jobdesk"
                  value={filters.jobdesk || ''}
                  onChange={(e) => handleFilterChange('jobdesk', e.target.value)}
                />
              </div>
            </>
          )}

          {(tableType === "admin_income" || tableType === "worker_income") && (
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="Code"
                value={filters.code || ''}
                onChange={(e) => handleFilterChange('code', e.target.value)}
              />
            </div>
          )}

          {tableType === "expenses" && (
            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Input
                id="keterangan"
                placeholder="Keterangan"
                value={filters.keterangan || ''}
                onChange={(e) => handleFilterChange('keterangan', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            onClick={handleSearch}
            className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90"
          >
            <Search className="h-4 w-4 mr-2" />
            Cari
          </Button>
          <Button 
            onClick={handleClear}
            variant="outline"
            className="border-secondary/30 hover:bg-secondary/10"
          >
            <X className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}