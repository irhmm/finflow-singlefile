import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Admin {
  id: number;
  nama: string;
  code: string;
  gaji_pokok: number;
  no_rek: string | null;
  nomor: string | null;
  role: string | null;
  status: string;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: Admin | null;
}

export function AdminModal({ isOpen, onClose, onSuccess, editData }: AdminModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    code: "",
    gaji_pokok: "",
    no_rek: "",
    nomor: "",
    role: "",
    status: "aktif",
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        nama: editData.nama,
        code: editData.code,
        gaji_pokok: editData.gaji_pokok.toString(),
        no_rek: editData.no_rek || "",
        nomor: editData.nomor || "",
        role: editData.role || "",
        status: editData.status,
      });
    } else {
      setFormData({
        nama: "",
        code: "",
        gaji_pokok: "",
        no_rek: "",
        nomor: "",
        role: "",
        status: "aktif",
      });
    }
  }, [editData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama.trim()) {
      toast.error("Nama admin harus diisi");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Code admin harus diisi");
      return;
    }
    if (!formData.gaji_pokok || parseFloat(formData.gaji_pokok) < 0) {
      toast.error("Gaji pokok harus diisi dengan nilai yang valid");
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        nama: formData.nama.trim(),
        code: formData.code.trim().toUpperCase(),
        gaji_pokok: parseFloat(formData.gaji_pokok),
        no_rek: formData.no_rek.trim() || null,
        nomor: formData.nomor.trim() || null,
        role: formData.role.trim() || null,
        status: formData.status,
      };

      if (editData) {
        const { error } = await supabase
          .from("admins")
          .update(dataToSave)
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("Admin berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("admins")
          .insert([dataToSave]);

        if (error) {
          if (error.code === "23505") {
            toast.error("Code admin sudah digunakan");
            return;
          }
          throw error;
        }
        toast.success("Admin berhasil ditambahkan");
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Gagal menyimpan data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Admin" : "Tambah Admin"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nama">Nama Admin *</Label>
            <Input
              id="nama"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Masukkan nama admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code Admin *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="Contoh: A1, A2"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gaji_pokok">Gaji Pokok *</Label>
            <Input
              id="gaji_pokok"
              type="number"
              value={formData.gaji_pokok}
              onChange={(e) => setFormData({ ...formData, gaji_pokok: e.target.value })}
              placeholder="Masukkan gaji pokok"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="no_rek">No. Rekening</Label>
            <Input
              id="no_rek"
              value={formData.no_rek}
              onChange={(e) => setFormData({ ...formData, no_rek: e.target.value })}
              placeholder="Masukkan nomor rekening"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomor">Nomor HP</Label>
            <Input
              id="nomor"
              value={formData.nomor}
              onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
              placeholder="Masukkan nomor HP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Contoh: Admin Keuangan, Super Admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="non aktif">Non Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}