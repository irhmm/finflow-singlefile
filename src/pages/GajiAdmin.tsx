import { useState, useEffect, useMemo } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, CheckCircle2, Clock, AlertCircle, TrendingUp, DollarSign, Users, Settings, Wallet } from 'lucide-react';

interface Admin {
  id: number;
  code: string;
  nama: string;
  gaji_pokok: number;
  status: string;
}

interface AdminTargetSetting {
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
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminIncomes, setAdminIncomes] = useState<AdminIncome[]>([]);
  const [targetSettings, setTargetSettings] = useState<AdminTargetSetting[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<AdminSalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal state for editing settings
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editingSettings, setEditingSettings] = useState<AdminTargetSetting>({
    admin_code: '',
    target_omset: 0,
    bonus_80_percent: 3,
    bonus_100_percent: 4,
    bonus_150_percent: 5
  });

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = 2024; y <= currentDate.getFullYear() + 1; y++) {
      years.push({ value: String(y), label: String(y) });
    }
    return years;
  }, [currentDate]);

  // Calculate records for each admin
  const calculatedRecords = useMemo(() => {
    return admins.map(admin => {
      const setting = targetSettings.find(s => s.admin_code === admin.code);
      const income = adminIncomes.find(i => i.code === admin.code);
      const actualIncome = income?.total || 0;
      const targetOmset = setting?.target_omset || 0;

      const result = calculateBonus(targetOmset, actualIncome, {
        bonus_80: setting?.bonus_80_percent || 3,
        bonus_100: setting?.bonus_100_percent || 4,
        bonus_150: setting?.bonus_150_percent || 5
      });

      const savedRecord = salaryRecords.find(r => r.admin_code === admin.code);

      return {
        admin,
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
  }, [admins, targetSettings, adminIncomes, salaryRecords]);

  // Summary statistics
  const totalGajiPokok = useMemo(() => {
    return admins.reduce((sum, admin) => sum + (admin.gaji_pokok || 0), 0);
  }, [admins]);

  const totalPendapatan = useMemo(() => {
    return adminIncomes.reduce((sum, income) => sum + income.total, 0);
  }, [adminIncomes]);

  const totalBonus = useMemo(() => {
    return calculatedRecords.reduce((sum, r) => sum + r.bonus_amount, 0);
  }, [calculatedRecords]);

  const pendingCount = useMemo(() => {
    return calculatedRecords.filter(r => r.status === 'pending').length;
  }, [calculatedRecords]);

  // Fetch active admins from admins table
  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('admins')
      .select('id, code, nama, gaji_pokok, status')
      .eq('status', 'aktif')
      .order('code');

    if (error) {
      console.error('Error fetching admins:', error);
      return;
    }

    setAdmins(data || []);
  };

  // Fetch target settings for all admins
  const fetchTargetSettings = async () => {
    const { data, error } = await supabase
      .from('admin_target_settings')
      .select('*');

    if (error) {
      console.error('Error fetching target settings:', error);
      return;
    }

    setTargetSettings(data || []);
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
      fetchAdmins(),
      fetchTargetSettings(),
      fetchAdminIncomes(),
      fetchSalaryRecords()
    ]);
    setLoading(false);
  };

  // Initial load
  useEffect(() => {
    fetchAdmins();
    fetchTargetSettings();
  }, []);

  // Refetch monthly data when month/year changes
  useEffect(() => {
    fetchAdminIncomes();
    fetchSalaryRecords();
  }, [selectedMonth, selectedYear]);

  // Open settings modal for an admin
  const openSettingsModal = (admin: Admin) => {
    setEditingAdmin(admin);
    const existing = targetSettings.find(s => s.admin_code === admin.code);
    setEditingSettings(existing || {
      admin_code: admin.code,
      target_omset: 0,
      bonus_80_percent: 3,
      bonus_100_percent: 4,
      bonus_150_percent: 5
    });
    setSettingsModalOpen(true);
  };

  // Save settings for an admin
  const saveAdminSettings = async () => {
    if (!editingAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_target_settings')
        .upsert({
          admin_code: editingAdmin.code,
          target_omset: editingSettings.target_omset,
          bonus_80_percent: editingSettings.bonus_80_percent,
          bonus_100_percent: editingSettings.bonus_100_percent,
          bonus_150_percent: editingSettings.bonus_150_percent
        }, {
          onConflict: 'admin_code'
        });

      if (error) throw error;

      toast.success(`Setting untuk ${editingAdmin.nama} berhasil disimpan`);
      setSettingsModalOpen(false);
      await fetchTargetSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan setting');
    } finally {
      setSaving(false);
    }
  };

  // Save rekap gaji for all admins
  const saveRekapGaji = async () => {
    setSaving(true);
    try {
      for (const record of calculatedRecords) {
        const { error } = await supabase
          .from('admin_salary_history')
          .upsert({
            admin_code: record.admin.code,
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

          {/* Period Selector */}
          <Card className="mb-6 border border-border/30 shadow-lg rounded-xl">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="w-40">
                  <Label className="text-sm font-medium mb-1 block">Bulan</Label>
                  <SearchableSelect
                    options={MONTHS}
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                    placeholder="Pilih Bulan"
                  />
                </div>
                <div className="w-32">
                  <Label className="text-sm font-medium mb-1 block">Tahun</Label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border border-border/30 shadow-lg rounded-xl">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gaji Pokok</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(totalGajiPokok)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/30 shadow-lg rounded-xl">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pendapatan</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(totalPendapatan)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/30 shadow-lg rounded-xl">
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
            <Card className="border border-border/30 shadow-lg rounded-xl">
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

          {/* Main Table */}
          <Card className="border border-border/30 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 bg-muted/30">
              <div>
                <CardTitle>Rekap Gaji - {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}</CardTitle>
              </div>
              <Button onClick={saveRekapGaji} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> Simpan Rekap
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8">Memuat data...</div>
              ) : admins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada admin aktif</p>
                  <p className="text-sm mt-1">Tambahkan admin di menu Data Admin</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/60 border-b-2 border-border/30">
                        <TableRow>
                          <TableHead className="px-6 py-4 border-r border-border/10 w-12">No</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10">Code</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10">Nama</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Gaji Pokok</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Target</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Pendapatan</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Pencapaian</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Bonus %</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10 text-right">Nominal Bonus</TableHead>
                          <TableHead className="px-6 py-4 border-r border-border/10">Status</TableHead>
                          <TableHead className="px-6 py-4">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculatedRecords.map((record, index) => (
                          <TableRow key={record.admin.code} className="hover:bg-muted/30">
                            <TableCell className="px-6 py-4 border-r border-border/10 text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 font-medium">{record.admin.code}</TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10">
                              {record.admin.nama}
                              {!record.hasSettings && (
                                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">
                                  Belum Setting
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 text-right">{formatCurrency(record.admin.gaji_pokok)}</TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 text-right">{formatCurrency(record.target_omset)}</TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 text-right">{formatCurrency(record.actual_income)}</TableCell>
                            <TableCell className={`px-6 py-4 border-r border-border/10 text-right ${getAchievementColor(record.achievement_percent)}`}>
                              {record.achievement_percent.toFixed(1)}%
                            </TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 text-right">{record.bonus_percent}%</TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10 text-right font-bold text-green-600">
                              {formatCurrency(record.bonus_amount)}
                            </TableCell>
                            <TableCell className="px-6 py-4 border-r border-border/10">
                              {record.status === 'paid' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Dibayar
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Clock className="w-3 h-3 mr-1" /> Pending
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSettingsModal(record.admin)}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                                {record.isSaved && record.status !== 'paid' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={() => markAsPaid(record.admin.code)}
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 p-4">
                    {calculatedRecords.map((record, index) => (
                      <Card key={record.admin.code} className="border border-border/30 shadow-md rounded-xl overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <h3 className="font-semibold text-lg">{record.admin.code} - {record.admin.nama}</h3>
                              {!record.hasSettings && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">
                                  Belum Setting
                                </span>
                              )}
                            </div>
                            {record.status === 'paid' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Dibayar
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-muted-foreground">Gaji Pokok</span>
                              <p className="font-medium">{formatCurrency(record.admin.gaji_pokok)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Target</span>
                              <p className="font-medium">{formatCurrency(record.target_omset)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pendapatan</span>
                              <p className="font-medium">{formatCurrency(record.actual_income)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pencapaian</span>
                              <p className={`font-medium ${getAchievementColor(record.achievement_percent)}`}>
                                {record.achievement_percent.toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Bonus %</span>
                              <p className="font-medium">{record.bonus_percent}%</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Nominal Bonus</span>
                              <p className="font-bold text-green-600">{formatCurrency(record.bonus_amount)}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSettingsModal(record.admin)}
                              className="flex-1"
                            >
                              <Settings className="w-4 h-4 mr-2" /> Setting
                            </Button>
                            {record.isSaved && record.status !== 'paid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => markAsPaid(record.admin.code)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Dibayar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Settings Modal */}
          <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Setting Gaji - {editingAdmin?.code} ({editingAdmin?.nama})</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="target_omset">Target Omset</Label>
                  <Input
                    id="target_omset"
                    type="number"
                    value={editingSettings.target_omset}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, target_omset: Number(e.target.value) }))}
                    placeholder="Masukkan target omset"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="bonus_80">Bonus 80%</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="bonus_80"
                        type="number"
                        value={editingSettings.bonus_80_percent}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, bonus_80_percent: Number(e.target.value) }))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bonus_100">Bonus 100%</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="bonus_100"
                        type="number"
                        value={editingSettings.bonus_100_percent}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, bonus_100_percent: Number(e.target.value) }))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bonus_150">Bonus 150%</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="bonus_150"
                        type="number"
                        value={editingSettings.bonus_150_percent}
                        onChange={(e) => setEditingSettings(prev => ({ ...prev, bonus_150_percent: Number(e.target.value) }))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Setting ini berlaku permanen sampai diubah. Bonus dihitung berdasarkan persentase pencapaian target.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsModalOpen(false)}>Batal</Button>
                <Button onClick={saveAdminSettings} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" /> Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
