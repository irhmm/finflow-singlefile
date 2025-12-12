import { useState, useEffect, useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calculator, Copy, Save, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface AdminTarget {
  id?: string;
  admin_code: string;
  target_omset: number;
  month: string;
  year: number;
  bonus_80_percent: number;
  bonus_100_percent: number;
  bonus_150_percent: number;
}

interface AdminSalaryRecord {
  id?: string;
  admin_code: string;
  month: string;
  year: number;
  target_omset: number;
  actual_income: number;
  achievement_percent: number;
  bonus_percent: number;
  bonus_amount: number;
  status: string;
  paid_at?: string;
}

interface AdminIncome {
  code: string;
  total: number;
}

const MONTHS = [
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const calculateBonus = (
  targetOmset: number,
  actualIncome: number,
  settings: { bonus_80: number; bonus_100: number; bonus_150: number }
) => {
  if (targetOmset === 0) return { percent: 0, amount: 0, achievement: 0 };

  const achievement = (actualIncome / targetOmset) * 100;

  let bonusPercent = 0;
  if (achievement >= 150) {
    bonusPercent = settings.bonus_150;
  } else if (achievement >= 100) {
    bonusPercent = settings.bonus_100;
  } else if (achievement >= 80) {
    bonusPercent = settings.bonus_80;
  }

  const bonusAmount = (actualIncome * bonusPercent) / 100;

  return {
    achievement: Math.round(achievement * 100) / 100,
    percent: bonusPercent,
    amount: bonusAmount
  };
};

export default function GajiAdmin() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [adminCodes, setAdminCodes] = useState<string[]>([]);
  const [adminIncomes, setAdminIncomes] = useState<AdminIncome[]>([]);
  const [targetSettings, setTargetSettings] = useState<AdminTarget[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<AdminSalaryRecord[]>([]);
  const [editingTargets, setEditingTargets] = useState<Record<string, AdminTarget>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = 2024; y <= currentDate.getFullYear() + 1; y++) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentDate]);

  // Fetch admin codes from admin_income
  const fetchAdminCodes = async () => {
    const { data, error } = await supabase
      .from('admin_income')
      .select('code')
      .not('code', 'is', null);

    if (error) {
      console.error('Error fetching admin codes:', error);
      return;
    }

    const uniqueCodes = [...new Set(data.map(d => d.code).filter(Boolean))].sort();
    setAdminCodes(uniqueCodes);
  };

  // Fetch admin incomes for selected month/year
  const fetchAdminIncomes = async () => {
    const startDate = `${selectedYear}-${selectedMonth}-01`;
    const endDate = new Date(selectedYear, parseInt(selectedMonth), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('admin_income')
      .select('code, nominal')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    if (error) {
      console.error('Error fetching admin incomes:', error);
      return;
    }

    // Group by code and sum
    const incomeMap: Record<string, number> = {};
    data.forEach(item => {
      if (item.code) {
        incomeMap[item.code] = (incomeMap[item.code] || 0) + Number(item.nominal || 0);
      }
    });

    const incomes = Object.entries(incomeMap).map(([code, total]) => ({ code, total }));
    setAdminIncomes(incomes);
  };

  // Fetch target settings for selected month/year
  const fetchTargetSettings = async () => {
    const { data, error } = await supabase
      .from('admin_target_settings')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    if (error) {
      console.error('Error fetching target settings:', error);
      return;
    }

    setTargetSettings(data || []);
  };

  // Fetch salary history for selected month/year
  const fetchSalaryRecords = async () => {
    const { data, error } = await supabase
      .from('admin_salary_history')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear);

    if (error) {
      console.error('Error fetching salary records:', error);
      return;
    }

    setSalaryRecords(data || []);
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAdminCodes(),
      fetchAdminIncomes(),
      fetchTargetSettings(),
      fetchSalaryRecords()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedMonth, selectedYear]);

  // Initialize editing targets when data changes
  useEffect(() => {
    const targets: Record<string, AdminTarget> = {};
    
    adminCodes.forEach(code => {
      const existing = targetSettings.find(t => t.admin_code === code);
      targets[code] = existing || {
        admin_code: code,
        target_omset: 0,
        month: selectedMonth,
        year: selectedYear,
        bonus_80_percent: 3,
        bonus_100_percent: 4,
        bonus_150_percent: 5
      };
    });
    
    setEditingTargets(targets);
  }, [adminCodes, targetSettings, selectedMonth, selectedYear]);

  const handleTargetChange = (code: string, field: keyof AdminTarget, value: number) => {
    setEditingTargets(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value
      }
    }));
  };

  const saveTargets = async () => {
    setSaving(true);
    try {
      for (const code of adminCodes) {
        const target = editingTargets[code];
        if (!target) continue;

        const { error } = await supabase
          .from('admin_target_settings')
          .upsert({
            admin_code: code,
            target_omset: target.target_omset,
            month: selectedMonth,
            year: selectedYear,
            bonus_80_percent: target.bonus_80_percent,
            bonus_100_percent: target.bonus_100_percent,
            bonus_150_percent: target.bonus_150_percent
          }, {
            onConflict: 'admin_code,month,year'
          });

        if (error) throw error;
      }

      toast.success('Target berhasil disimpan');
      await fetchTargetSettings();
    } catch (error) {
      console.error('Error saving targets:', error);
      toast.error('Gagal menyimpan target');
    } finally {
      setSaving(false);
    }
  };

  const copyFromPreviousMonth = async () => {
    const prevMonth = parseInt(selectedMonth) === 1 ? 12 : parseInt(selectedMonth) - 1;
    const prevYear = parseInt(selectedMonth) === 1 ? selectedYear - 1 : selectedYear;
    const prevMonthStr = String(prevMonth).padStart(2, '0');

    const { data, error } = await supabase
      .from('admin_target_settings')
      .select('*')
      .eq('month', prevMonthStr)
      .eq('year', prevYear);

    if (error) {
      toast.error('Gagal mengambil data bulan sebelumnya');
      return;
    }

    if (!data || data.length === 0) {
      toast.info('Tidak ada data target di bulan sebelumnya');
      return;
    }

    const newTargets: Record<string, AdminTarget> = { ...editingTargets };
    data.forEach(item => {
      if (newTargets[item.admin_code]) {
        newTargets[item.admin_code] = {
          ...newTargets[item.admin_code],
          target_omset: item.target_omset,
          bonus_80_percent: item.bonus_80_percent,
          bonus_100_percent: item.bonus_100_percent,
          bonus_150_percent: item.bonus_150_percent
        };
      }
    });

    setEditingTargets(newTargets);
    toast.success('Target berhasil di-copy dari bulan sebelumnya');
  };

  const calculateAndSaveRecords = async () => {
    setSaving(true);
    try {
      for (const code of adminCodes) {
        const target = targetSettings.find(t => t.admin_code === code);
        const income = adminIncomes.find(i => i.code === code);

        const targetOmset = target?.target_omset || 0;
        const actualIncome = income?.total || 0;

        const result = calculateBonus(targetOmset, actualIncome, {
          bonus_80: target?.bonus_80_percent || 3,
          bonus_100: target?.bonus_100_percent || 4,
          bonus_150: target?.bonus_150_percent || 5
        });

        const { error } = await supabase
          .from('admin_salary_history')
          .upsert({
            admin_code: code,
            month: selectedMonth,
            year: selectedYear,
            target_omset: targetOmset,
            actual_income: actualIncome,
            achievement_percent: result.achievement,
            bonus_percent: result.percent,
            bonus_amount: result.amount,
            status: 'pending'
          }, {
            onConflict: 'admin_code,month,year'
          });

        if (error) throw error;
      }

      toast.success('Rekap gaji berhasil dihitung');
      await fetchSalaryRecords();
    } catch (error) {
      console.error('Error calculating records:', error);
      toast.error('Gagal menghitung rekap gaji');
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (code: string) => {
    try {
      const { error } = await supabase
        .from('admin_salary_history')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('admin_code', code)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (error) throw error;

      toast.success(`Admin ${code} ditandai sudah dibayar`);
      await fetchSalaryRecords();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Gagal update status');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Dibayar</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
  };

  const getAchievementColor = (achievement: number) => {
    if (achievement >= 150) return 'text-green-600 font-bold';
    if (achievement >= 100) return 'text-blue-600 font-semibold';
    if (achievement >= 80) return 'text-yellow-600';
    return 'text-red-500';
  };

  const totalBonus = salaryRecords.reduce((sum, r) => sum + r.bonus_amount, 0);
  const pendingCount = salaryRecords.filter(r => r.status === 'pending').length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTable="gaji_admin" onTableChange={() => {}} />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-foreground">Gaji Admin</h1>
          </div>

          {/* Period Selector */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="w-40">
                  <label className="text-sm font-medium mb-1 block">Bulan</label>
                  <SearchableSelect
                    options={MONTHS}
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                    placeholder="Pilih Bulan"
                  />
                </div>
                <div className="w-32">
                  <label className="text-sm font-medium mb-1 block">Tahun</label>
                  <SearchableSelect
                    options={yearOptions}
                    value={String(selectedYear)}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                    placeholder="Pilih Tahun"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="settings">Setting Target</TabsTrigger>
              <TabsTrigger value="recap">Rekap Gaji</TabsTrigger>
            </TabsList>

            {/* Tab 1: Setting Target */}
            <TabsContent value="settings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Setting Target Admin - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyFromPreviousMonth}>
                      <Copy className="w-4 h-4 mr-2" /> Copy Bulan Lalu
                    </Button>
                    <Button onClick={saveTargets} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" /> Simpan Target
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Memuat data...</div>
                  ) : adminCodes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      Tidak ada admin ditemukan di Pendapatan Admin
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead>Target Omset</TableHead>
                            <TableHead>Bonus 80%</TableHead>
                            <TableHead>Bonus 100%</TableHead>
                            <TableHead>Bonus 150%</TableHead>
                            <TableHead>Pendapatan Aktual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminCodes.map(code => {
                            const target = editingTargets[code];
                            const income = adminIncomes.find(i => i.code === code);
                            const hasTarget = targetSettings.some(t => t.admin_code === code);

                            return (
                              <TableRow key={code}>
                                <TableCell className="font-medium">
                                  {code}
                                  {!hasTarget && (
                                    <Badge variant="destructive" className="ml-2 text-xs">Baru</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    className="w-36"
                                    value={target?.target_omset || 0}
                                    onChange={(e) => handleTargetChange(code, 'target_omset', Number(e.target.value))}
                                    placeholder="Target"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={target?.bonus_80_percent || 3}
                                      onChange={(e) => handleTargetChange(code, 'bonus_80_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={target?.bonus_100_percent || 4}
                                      onChange={(e) => handleTargetChange(code, 'bonus_100_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={target?.bonus_150_percent || 5}
                                      onChange={(e) => handleTargetChange(code, 'bonus_150_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(income?.total || 0)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Rekap Gaji */}
            <TabsContent value="recap">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Rekap Gaji Admin - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total Bonus: <span className="font-bold text-primary">{formatCurrency(totalBonus)}</span>
                      {pendingCount > 0 && <span className="ml-4">({pendingCount} pending)</span>}
                    </p>
                  </div>
                  <Button onClick={calculateAndSaveRecords} disabled={saving}>
                    <Calculator className="w-4 h-4 mr-2" /> Hitung Ulang
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Memuat data...</div>
                  ) : salaryRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      Belum ada rekap. Klik "Hitung Ulang" untuk menghitung bonus.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Admin</TableHead>
                            <TableHead className="text-right">Target</TableHead>
                            <TableHead className="text-right">Pendapatan</TableHead>
                            <TableHead className="text-right">Pencapaian</TableHead>
                            <TableHead className="text-right">Bonus %</TableHead>
                            <TableHead className="text-right">Nominal Bonus</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salaryRecords.map(record => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.admin_code}</TableCell>
                              <TableCell className="text-right">{formatCurrency(record.target_omset)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(record.actual_income)}</TableCell>
                              <TableCell className={`text-right ${getAchievementColor(record.achievement_percent)}`}>
                                {record.achievement_percent.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right">{record.bonus_percent}%</TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(record.bonus_amount)}
                              </TableCell>
                              <TableCell>{getStatusBadge(record.status)}</TableCell>
                              <TableCell>
                                {record.status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAsPaid(record.admin_code)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Tandai Dibayar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}
