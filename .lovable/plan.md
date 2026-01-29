

## Rencana: Tambah Fitur Edit dan Hapus di Rekap Gaji Worker

### Fitur yang Akan Ditambahkan

Menambahkan tombol **Edit** dan **Hapus** pada tabel "Rincian Pengambilan Gaji" untuk data `salary_withdrawals`.

### Perubahan pada File `src/pages/RekapGajiWorker.tsx`

#### 1. Tambah State untuk Edit dan Delete

```typescript
// State untuk edit
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
const [editingWithdrawal, setEditingWithdrawal] = useState<SalaryWithdrawal | null>(null);
const [editFormData, setEditFormData] = useState({
  amount: "",
  catatan: ""
});

// State untuk delete
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [deletingWithdrawal, setDeletingWithdrawal] = useState<SalaryWithdrawal | null>(null);
```

#### 2. Tambah Import Icon

```typescript
import { Plus, Wallet, Check, ChevronsUpDown, TrendingUp, ClipboardList, Calculator, Filter, Edit, Trash2 } from "lucide-react";
```

#### 3. Tambah Fungsi Handle Edit

```typescript
const handleEditClick = (withdrawal: SalaryWithdrawal) => {
  setEditingWithdrawal(withdrawal);
  setEditFormData({
    amount: String(withdrawal.amount),
    catatan: withdrawal.catatan || ""
  });
  setIsEditDialogOpen(true);
};

const handleEditSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingWithdrawal) return;

  const newAmount = Number(editFormData.amount);
  
  // Validasi: hitung sisa gaji (sebelum perubahan)
  const normalizedWorker = normalizeWorkerName(editingWithdrawal.worker);
  const startDate = `${selectedMonth}-01`;
  const endDate = format(...);
  
  // Hitung saldo tersedia (termasuk withdrawal lama)
  // remainingBalance + oldAmount = available untuk edit
  const availableBalance = summary.remainingBalance + editingWithdrawal.amount;
  
  if (newAmount > availableBalance) {
    toast.error(`Pengambilan melebihi sisa gaji!`);
    return;
  }

  const { error } = await supabase
    .from("salary_withdrawals")
    .update({
      amount: newAmount,
      catatan: editFormData.catatan || null
    })
    .eq("id", editingWithdrawal.id);

  if (error) { toast.error("Gagal mengupdate"); return; }
  
  toast.success("Pengambilan gaji berhasil diupdate!");
  setIsEditDialogOpen(false);
  setEditingWithdrawal(null);
  fetchData();
};
```

#### 4. Tambah Fungsi Handle Delete

```typescript
const handleDeleteClick = (withdrawal: SalaryWithdrawal) => {
  setDeletingWithdrawal(withdrawal);
  setIsDeleteDialogOpen(true);
};

const handleDeleteConfirm = async () => {
  if (!deletingWithdrawal) return;

  const { error } = await supabase
    .from("salary_withdrawals")
    .delete()
    .eq("id", deletingWithdrawal.id);

  if (error) { toast.error("Gagal menghapus"); return; }

  toast.success("Pengambilan gaji berhasil dihapus!");
  setIsDeleteDialogOpen(false);
  setDeletingWithdrawal(null);
  fetchData();
};
```

#### 5. Update Tabel Pengambilan Gaji - Tambah Kolom Aksi

```typescript
<TableHeader>
  <TableRow className="bg-slate-50">
    <TableHead className="font-semibold">Tanggal</TableHead>
    <TableHead className="font-semibold text-right">Jumlah</TableHead>
    <TableHead className="font-semibold">Catatan</TableHead>
    {canWrite && <TableHead className="font-semibold text-center">Aksi</TableHead>}
  </TableRow>
</TableHeader>
<TableBody>
  {salaryWithdrawals.map((withdrawal) => (
    <TableRow key={withdrawal.id}>
      <TableCell>{formatDate(withdrawal.tanggal)}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(withdrawal.amount)}
      </TableCell>
      <TableCell>{withdrawal.catatan || "-"}</TableCell>
      {canWrite && (
        <TableCell className="text-center">
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => handleEditClick(withdrawal)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDeleteClick(withdrawal)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  ))}
</TableBody>
```

#### 6. Tambah Dialog Edit

```typescript
<Dialog open={isEditDialogOpen} onOpenChange={(open) => {
  setIsEditDialogOpen(open);
  if (!open) setEditingWithdrawal(null);
}}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Pengambilan Gaji</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleEditSubmit} className="space-y-4">
      {/* Worker (read-only) */}
      <div className="space-y-2">
        <Label>Worker</Label>
        <Input value={editingWithdrawal?.worker || ""} disabled />
      </div>
      
      {/* Amount */}
      <div className="space-y-2">
        <Label>Jumlah</Label>
        <Input
          type="number"
          value={editFormData.amount}
          onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
        />
      </div>
      
      {/* Catatan */}
      <div className="space-y-2">
        <Label>Catatan</Label>
        <Textarea
          value={editFormData.catatan}
          onChange={(e) => setEditFormData(prev => ({ ...prev, catatan: e.target.value }))}
        />
      </div>
      
      <Button type="submit" disabled={!editFormData.amount}>Simpan</Button>
    </form>
  </DialogContent>
</Dialog>
```

#### 7. Gunakan DeleteConfirmModal

```typescript
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

// Di bagian return, tambahkan:
<DeleteConfirmModal
  isOpen={isDeleteDialogOpen}
  onClose={() => {
    setIsDeleteDialogOpen(false);
    setDeletingWithdrawal(null);
  }}
  onConfirm={handleDeleteConfirm}
  recordType="pengambilan gaji"
/>
```

### Ringkasan Perubahan

| Komponen | Perubahan |
|----------|-----------|
| State | Tambah state untuk edit dialog, delete dialog, editing record |
| Import | Tambah icon `Edit`, `Trash2` dan `DeleteConfirmModal` |
| Tabel Pengambilan | Tambah kolom "Aksi" dengan tombol Edit dan Delete |
| Dialog Edit | Form untuk mengubah amount dan catatan |
| Dialog Delete | Konfirmasi sebelum menghapus data |
| Validasi | Edit amount tidak boleh melebihi sisa gaji yang tersedia |

### Hak Akses
- Tombol Edit dan Delete hanya muncul untuk role: `admin`, `admin_keuangan`, `super_admin`
- RLS policies di database sudah mendukung UPDATE dan DELETE untuk role tersebut

