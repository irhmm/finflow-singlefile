import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TableType, DataRecord, AdminIncome, WorkerIncome, Expense, Worker } from "./FinancialDashboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableType: TableType;
  editingRecord?: DataRecord | null;
}

const tableLabels = {
  admin_income: "Pendapatan Admin",
  worker_income: "Pendapatan Worker",
  expenses: "Pengeluaran",
  workers: "Data Worker"
};

export function DataModal({ isOpen, onClose, tableType, editingRecord }: DataModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setFormData(editingRecord);
    } else {
      // Reset form for new record
      const today = new Date().toISOString().split('T')[0];
      
      switch (tableType) {
        case "admin_income":
          setFormData({ tanggal: today, code: "", nominal: "" });
          break;
        case "worker_income":
          setFormData({ 
            tanggal: today, 
            code: "", 
            jobdesk: "", 
            worker: "", 
            fee: "" 
          });
          break;
        case "expenses":
          setFormData({ tanggal: today, keterangan: "", nominal: "" });
          break;
        case "workers":
          setFormData({ 
            nama: "", 
            rekening: "", 
            nomor_wa: "", 
            role: "", 
            status: "aktif" 
          });
          break;
      }
    }
  }, [editingRecord, tableType, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Prepare data for submission
      const submitData = { ...formData };
      
      // Convert string numbers to actual numbers
      if (tableType === "admin_income" || tableType === "expenses") {
        submitData.nominal = parseFloat(submitData.nominal);
      } else if (tableType === "worker_income") {
        submitData.fee = parseFloat(submitData.fee);
      }
      // Workers table doesn't need numeric conversion

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from(tableType)
          .update(submitData)
          .eq("id", editingRecord.id);

        if (error) throw error;

        toast({
          title: "Berhasil",
          description: "Data berhasil diperbarui"
        });
      } else {
        // Create new record
        const { error } = await supabase
          .from(tableType)
          .insert([submitData]);

        if (error) throw error;

        toast({
          title: "Berhasil", 
          description: "Data berhasil ditambahkan"
        });
      }

      onClose();
    } catch (error) {
      console.error("Error saving record:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan data",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const renderFormFields = () => {
    switch (tableType) {
      case "admin_income":
        return (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tanggal" className="text-right">
                  Tanggal
                </Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal || ""}
                  onChange={(e) => handleInputChange("tanggal", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Kode (opsional)"
                  value={formData.code || ""}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nominal" className="text-right">
                  Nominal
                </Label>
                <Input
                  id="nominal"
                  type="number"
                  placeholder="0"
                  value={formData.nominal || ""}
                  onChange={(e) => handleInputChange("nominal", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
          </>
        );

      case "worker_income":
        return (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tanggal" className="text-right">
                  Tanggal
                </Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal || ""}
                  onChange={(e) => handleInputChange("tanggal", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Kode
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Kode project"
                  value={formData.code || ""}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="jobdesk" className="text-right">
                  Jobdesk
                </Label>
                <Input
                  id="jobdesk"
                  type="text"
                  placeholder="Deskripsi pekerjaan"
                  value={formData.jobdesk || ""}
                  onChange={(e) => handleInputChange("jobdesk", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="worker" className="text-right">
                  Worker
                </Label>
                <Input
                  id="worker"
                  type="text"
                  placeholder="Nama worker"
                  value={formData.worker || ""}
                  onChange={(e) => handleInputChange("worker", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fee" className="text-right">
                  Fee
                </Label>
                <Input
                  id="fee"
                  type="number"
                  placeholder="0"
                  value={formData.fee || ""}
                  onChange={(e) => handleInputChange("fee", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
          </>
        );

      case "expenses":
        return (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tanggal" className="text-right">
                  Tanggal
                </Label>
                <Input
                  id="tanggal"
                  type="date"
                  value={formData.tanggal || ""}
                  onChange={(e) => handleInputChange("tanggal", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="keterangan" className="text-right">
                  Keterangan
                </Label>
                <Input
                  id="keterangan"
                  type="text"
                  placeholder="Keterangan (opsional)"
                  value={formData.keterangan || ""}
                  onChange={(e) => handleInputChange("keterangan", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nominal" className="text-right">
                  Nominal
                </Label>
                <Input
                  id="nominal"
                  type="number"
                  placeholder="0"
                  value={formData.nominal || ""}
                  onChange={(e) => handleInputChange("nominal", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
          </>
        );

      case "workers":
        return (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nama" className="text-right">
                  Nama
                </Label>
                <Input
                  id="nama"
                  type="text"
                  placeholder="Nama worker"
                  value={formData.nama || ""}
                  onChange={(e) => handleInputChange("nama", e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rekening" className="text-right">
                  Rekening
                </Label>
                <Input
                  id="rekening"
                  type="text"
                  placeholder="Nomor rekening"
                  value={formData.rekening || ""}
                  onChange={(e) => handleInputChange("rekening", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nomor_wa" className="text-right">
                  Nomor WA
                </Label>
                <Input
                  id="nomor_wa"
                  type="text"
                  placeholder="Nomor WhatsApp"
                  value={formData.nomor_wa || ""}
                  onChange={(e) => handleInputChange("nomor_wa", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role
                </Label>
                <Input
                  id="role"
                  type="text"
                  placeholder="Role/posisi"
                  value={formData.role || ""}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <select
                  id="status"
                  value={formData.status || "aktif"}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="aktif">Aktif</option>
                  <option value="non aktif">Non Aktif</option>
                </select>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? "Edit" : "Tambah"} {tableLabels[tableType]}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? `Perbarui data ${tableLabels[tableType].toLowerCase()}`
              : `Tambahkan data ${tableLabels[tableType].toLowerCase()} baru`
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          {renderFormFields()}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}