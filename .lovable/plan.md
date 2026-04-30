## Masalah

Di halaman Rekap Gaji Worker, kadang setelah menambah/mengubah pengambilan gaji, data masuk ke database tetapi tampilan tidak berubah. Penyebab yang teridentifikasi di `src/pages/RekapGajiWorker.tsx`:

1. **Page pagination tidak direset** setelah insert/edit/delete. Data baru muncul di page 1 (karena `order tanggal desc`), tapi user mungkin sedang di page 2/3 — sehingga UI seakan tidak berubah.
2. **Race condition fetch ganda**: saat filter (worker/month) berubah, `setIncomePage(1)` & `setWithdrawalPage(1)` memicu satu `useEffect`, sementara perubahan filter sendiri memicu `useEffect` lain. Dua `fetchData()` jalan paralel — response yang datang belakangan menimpa yang benar.
3. **Tidak ada request-id guard** di `fetchData` — response lama bisa menimpa response baru.
4. **`fetchAvailableMonths` & `fetchWorkers` tidak dipanggil ulang** setelah insert, sehingga dropdown bulan/worker tidak terupdate jika ada bulan baru.
5. **Tidak ada realtime subscription** — perubahan dari tab/device lain tidak ter-reflect.

## Perbaikan di `src/pages/RekapGajiWorker.tsx`

### 1. Reset pagination ke page 1 sebelum refetch pada setiap mutasi

Di akhir `handleSubmit`, `handleEditSubmit`, dan `handleDeleteConfirm`, sebelum panggil `fetchData()`:
```ts
setIncomePage(1);
setWithdrawalPage(1);
await fetchData(true); // force fetch dengan page 1
fetchAvailableMonths(); // refresh daftar bulan
fetchWorkers();         // refresh daftar worker
```

### 2. Tambahkan request-id guard di `fetchData` untuk cegah race condition

```ts
const fetchIdRef = useRef(0);

const fetchData = async () => {
  const myId = ++fetchIdRef.current;
  setIsLoading(true);
  try {
    // ... query seperti biasa ...
    if (myId !== fetchIdRef.current) return; // response basi, abaikan
    setWorkerIncomes(...);
    setSalaryWithdrawals(...);
    setSummary(...);
  } finally {
    if (myId === fetchIdRef.current) setIsLoading(false);
  }
};
```

### 3. Gabungkan kedua `useEffect` agar tidak fetch ganda

Hapus useEffect terpisah untuk pagination. Gunakan satu useEffect dengan dependency `[selectedWorker, selectedMonth, incomePage, withdrawalPage]`. Ketika filter berubah, reset page lewat handler dropdown (bukan via useEffect terpisah) sehingga state berubah dalam satu render batch.

```ts
const handleWorkerChange = (w: string) => {
  setIncomePage(1);
  setWithdrawalPage(1);
  setSelectedWorker(w);
};
const handleMonthChange = (m: string) => {
  setIncomePage(1);
  setWithdrawalPage(1);
  setSelectedMonth(m);
};

useEffect(() => {
  fetchData();
}, [selectedWorker, selectedMonth, incomePage, withdrawalPage]);
```

### 4. Tambahkan realtime subscription untuk `salary_withdrawals` dan `worker_income`

```ts
useEffect(() => {
  const channel = supabase
    .channel('rekap-gaji-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'salary_withdrawals' },
      () => fetchData()
    )
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'worker_income' },
      () => fetchData()
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [selectedWorker, selectedMonth, incomePage, withdrawalPage]);
```

### 5. Migrasi DB — aktifkan realtime untuk tabel terkait

```sql
ALTER TABLE public.salary_withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.worker_income REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_income;
```
(Akan dijalankan dengan `IF NOT EXISTS` guard via DO block agar aman jika sudah ada.)

### 6. Toast yang lebih informatif

Setelah insert berhasil, toast tetap ditampilkan, tapi sekarang user akan langsung melihat baris baru karena page sudah direset ke 1.

## Ringkasan Hasil

| Skenario | Sebelum | Sesudah |
|---|---|---|
| Tambah pengambilan saat di page 2 | UI tidak berubah | Auto pindah page 1, baris baru muncul |
| Race condition fetch ganda | Data lama menimpa baru | Request-id guard mengabaikan response basi |
| Pengambilan di bulan baru | Dropdown bulan tidak update | Auto refresh daftar bulan |
| Perubahan dari tab lain | Tidak ter-reflect | Realtime subscription auto-refresh |
| Edit/Hapus saat di page > 1 | UI mungkin tetap | Reset ke page 1 + refetch |

File yang diubah: `src/pages/RekapGajiWorker.tsx` + 1 migrasi SQL untuk realtime.
