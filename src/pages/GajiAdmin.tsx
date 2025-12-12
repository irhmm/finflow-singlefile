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
import { Save, CheckCircle2, Clock, AlertCircle, TrendingUp, DollarSign, Users, Settings } from 'lucide-react';

interface AdminTargetPermanent {
  id?: string;
  admin_code: string;
  target_omset: number;
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
  const [permanentSettings, setPermanentSettings] = useState<AdminTargetPermanent[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<AdminSalaryRecord[]>([]);
  const [editingSettings, setEditingSettings] = useState<Record<string, AdminTargetPermanent>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = 2024; y <= currentDate.getFullYear() + 1; y++) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentDate]);

  // Calculate real-time bonus for each admin based on permanent settings and monthly income
  const calculatedRecords = useMemo(() => {
    return adminCodes.map(code => {
      const setting = permanentSettings.find(s => s.admin_code === code);
      const income = adminIncomes.find(i => i.code === code);
      const actualIncome = income?.total || 0;
      const targetOmset = setting?.target_omset || 0;

      const result = calculateBonus(targetOmset, actualIncome, {
        bonus_80: setting?.bonus_80_percent || 3,
        bonus_100: setting?.bonus_100_percent || 4,
        bonus_150: setting?.bonus_150_percent || 5
      });

      // Check if saved in salary history
      const savedRecord = salaryRecords.find(r => r.admin_code === code);

      return {
        admin_code: code,
        target_omset: targetOmset,
        actual_income: actualIncome,
        achievement_percent: result.achievement,
        bonus_percent: result.percent,
        bonus_amount: result.amount,
        status: savedRecord?.status || 'pending',
        paid_at: savedRecord?.paid_at,
        isSaved: !!savedRecord,
        hasSettings: !!setting
      };
    });
  }, [adminCodes, permanentSettings, adminIncomes, salaryRecords]);

  // Summary statistics for recap tab
  const totalAdminIncome = useMemo(() => {
    return adminIncomes.reduce((sum, income) => sum + income.total, 0);
  }, [adminIncomes]);

  const totalBonus = useMemo(() => {
    return calculatedRecords.reduce((sum, r) => sum + r.bonus_amount, 0);
  }, [calculatedRecords]);

  const pendingCount = useMemo(() => {
    return calculatedRecords.filter(r => r.status === 'pending').length;
  }, [calculatedRecords]);

  // Fetch admin codes from admin_income (all unique codes)
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

  // Fetch permanent settings (no month/year filter)
  const fetchPermanentSettings = async () => {
    const { data, error } = await supabase
      .from('admin_target_settings')
      .select('*');

    if (error) {
      console.error('Error fetching permanent settings:', error);
      return;
    }

    setPermanentSettings(data || []);
  };

  // Fetch admin incomes for selected month/year (for recap tab)
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
      fetchPermanentSettings(),
      fetchAdminIncomes(),
      fetchSalaryRecords()
    ]);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchAdminCodes();
    fetchPermanentSettings();
  }, []);

  // Refetch monthly data when month/year changes
  useEffect(() => {
    fetchAdminIncomes();
    fetchSalaryRecords();
  }, [selectedMonth, selectedYear]);

  // Initialize editing settings when data changes
  useEffect(() => {
    const settings: Record<string, AdminTargetPermanent> = {};
    
    adminCodes.forEach(code => {
      const existing = permanentSettings.find(s => s.admin_code === code);
      settings[code] = existing || {
        admin_code: code,
        target_omset: 0,
        bonus_80_percent: 3,
        bonus_100_percent: 4,
        bonus_150_percent: 5
      };
    });
    
    setEditingSettings(settings);
  }, [adminCodes, permanentSettings]);

  const handleSettingChange = (code: string, field: keyof AdminTargetPermanent, value: number) => {
    setEditingSettings(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        [field]: value
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      for (const code of adminCodes) {
        const setting = editingSettings[code];
        if (!setting) continue;

        const { error } = await supabase
          .from('admin_target_settings')
          .upsert({
            admin_code: code,
            target_omset: setting.target_omset,
            bonus_80_percent: setting.bonus_80_percent,
            bonus_100_percent: setting.bonus_100_percent,
            bonus_150_percent: setting.bonus_150_percent
          }, {
            onConflict: 'admin_code'
          });

        if (error) throw error;
      }

      toast.success('Setting gaji admin berhasil disimpan');
      await fetchPermanentSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan setting');
    } finally {
      setSaving(false);
    }
  };

  const saveRekapGaji = async () => {
    setSaving(true);
    try {
      for (const record of calculatedRecords) {
        const { error } = await supabase
          .from('admin_salary_history')
          .upsert({
            admin_code: record.admin_code,
            month: selectedMonth,
            year: selectedYear,
            target_omset: record.target_omset,
            actual_income: record.actual_income,
            achievement_percent: record.achievement_percent,
            bonus_percent: record.bonus_percent,
            bonus_amount: record.bonus_amount,
            status: record.status
          }, {
            onConflict: 'admin_code,month,year'
          });

        if (error) throw error;
      }

      toast.success('Rekap gaji berhasil disimpan');
      await fetchSalaryRecords();
    } catch (error) {
      console.error('Error saving records:', error);
      toast.error('Gagal menyimpan rekap gaji');
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
    return 'text-muted-foreground';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTable="gaji_admin" onTableChange={() => {}} />
        <main className="flex-1 p-4 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold text-foreground">Gaji Admin</h1>
          </div>

          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" /> Setting Gaji
              </TabsTrigger>
              <TabsTrigger value="recap" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Rekap Gaji
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Setting Gaji Admin (Permanent) */}
            <TabsContent value="settings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Setting Gaji Admin</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Setting ini berlaku permanen sampai diubah
                    </p>
                  </div>
                  <Button onClick={saveSettings} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" /> Simpan Setting
                  </Button>
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
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminCodes.map(code => {
                            const setting = editingSettings[code];
                            const hasSetting = permanentSettings.some(s => s.admin_code === code);

                            return (
                              <TableRow key={code}>
                                <TableCell className="font-medium">{code}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    className="w-36"
                                    value={setting?.target_omset || 0}
                                    onChange={(e) => handleSettingChange(code, 'target_omset', Number(e.target.value))}
                                    placeholder="Target"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={setting?.bonus_80_percent || 3}
                                      onChange={(e) => handleSettingChange(code, 'bonus_80_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={setting?.bonus_100_percent || 4}
                                      onChange={(e) => handleSettingChange(code, 'bonus_100_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      className="w-16"
                                      value={setting?.bonus_150_percent || 5}
                                      onChange={(e) => handleSettingChange(code, 'bonus_150_percent', Number(e.target.value))}
                                    />
                                    <span className="text-muted-foreground">%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {hasSetting ? (
                                    <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Tersimpan</Badge>
                                  ) : (
                                    <Badge variant="destructive">Belum Disetting</Badge>
                                  )}
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

            {/* Tab 2: Rekap Gaji Admin (Per Bulan) */}
            <TabsContent value="recap">
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

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <DollarSign className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                        <p className="text-xl font-bold text-foreground">{formatCurrency(totalAdminIncome)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Bonus</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(totalBonus)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 rounded-lg">
                        <Users className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Admin Pending</p>
                        <p className="text-xl font-bold text-foreground">{pendingCount} Admin</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rekap Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>Rekap Gaji - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
                  </div>
                  <Button onClick={saveRekapGaji} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" /> Simpan Rekap
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Memuat data...</div>
                  ) : calculatedRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      Tidak ada data admin untuk periode ini
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
                          {calculatedRecords.map(record => (
                            <TableRow key={record.admin_code}>
                              <TableCell className="font-medium">
                                {record.admin_code}
                                {!record.hasSettings && (
                                  <Badge variant="destructive" className="ml-2 text-xs">Belum Disetting</Badge>
                                )}
                              </TableCell>
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
                                {record.isSaved && record.status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markAsPaid(record.admin_code)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Dibayar
                                  </Button>
                                )}
                                {!record.isSaved && (
                                  <span className="text-xs text-muted-foreground">Simpan dulu</span>
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
