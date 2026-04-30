## Analisa Masalah

Saya sudah cek kode `src/pages/RekapGajiWorker.tsx`, network request, dan isi tabel Supabase. Penyebab utama yang paling kuat adalah filter tanggal untuk tabel `salary_withdrawals` yang bertipe `timestamp with time zone`.

Saat ini halaman memakai:

```ts
.gte("tanggal", "2026-04-01")
.lte("tanggal", "2026-04-30")
```

Untuk kolom `timestamp with time zone`, batas akhir `2026-04-30` dibaca sebagai `2026-04-30 00:00:00`, sehingga data yang dibuat pada tanggal 30 setelah jam 00:00 tidak ikut terbaca. Ini membuat kasus “data masuk ke Supabase tapi tidak tampil di web”. Di network request terlihat query memang mengembalikan `[]` untuk April 2026, walaupun input baru bisa saja berada di tanggal akhir bulan atau bulan yang tidak sedang aktif.

Selain itu, ada beberapa kelemahan lain untuk penggunaan di VPS/self-hosted:

1. Realtime tidak bisa dijadikan satu-satunya andalan karena VPS/self-hosted Supabase kadang belum mengaktifkan publication/realtime websocket dengan benar.
2. Setelah insert, kode memanggil `setWithdrawalPage(1)` lalu langsung `fetchData()`. Karena state React belum tentu sudah berubah saat fetch dijalankan, fetch bisa tetap memakai page/filter lama.
3. Insert `salary_withdrawals` tidak mengirim `tanggal` eksplisit, sehingga tanggal mengikuti timezone/default database. Di VPS berbeda timezone, data bisa masuk ke bulan/hari berbeda dari yang sedang ditampilkan.
4. Default bulan di Rekap Gaji Worker masih bulan saat ini, padahal memory project mengharuskan default ke bulan terbaru yang punya data.
5. Query worker/month tanpa `.range()` bisa terkena limit default Supabase 1000 row pada data besar.

## Rencana Perbaikan

### 1. Perbaiki filter bulan untuk timestamp agar aman di semua timezone

Tambahkan helper rentang bulan:

```ts
const getMonthRange = (month: string) => ({
  startDate: `${month}-01`,
  nextMonthStart: ...
});
```

Untuk `worker_income` yang bertipe `date`:

```ts
.gte("tanggal", startDate)
.lt("tanggal", nextMonthStart)
```

Untuk `salary_withdrawals` yang bertipe `timestamp with time zone`:

```ts
.gte("tanggal", `${startDate}T00:00:00+07:00`)
.lt("tanggal", `${nextMonthStart}T00:00:00+07:00`)
```

Ini memastikan seluruh tanggal dalam bulan terpilih ikut tampil, termasuk hari terakhir sampai jam 23:59:59.

### 2. Saat menambah pengambilan, simpan tanggal eksplisit sesuai bulan yang sedang dipilih

Ubah insert agar menyertakan `tanggal` eksplisit:

```ts
tanggal: new Date().toISOString() // jika bulan aktif adalah bulan sekarang
```

Jika user sedang melihat bulan lain, tanggal akan dibuat di bulan tersebut agar data langsung terlihat pada filter yang sedang dipakai:

```ts
tanggal: `${selectedMonth}-${hariAman}T...+07:00`
```

Dengan begitu data tidak “hilang” karena masuk ke bulan database/server yang berbeda.

### 3. Buat fungsi refresh yang tidak bergantung pada state React yang belum update

Tambahkan fungsi seperti:

```ts
const refreshAfterMutation = async (workerOverride?, monthOverride?) => {
  fetchIdRef.current += 1;
  setIncomePage(1);
  setWithdrawalPage(1);
  await fetchData({ incomePage: 1, withdrawalPage: 1, worker: workerOverride, month: monthOverride });
  await Promise.all([fetchAvailableMonths(), fetchWorkers()]);
};
```

Lalu gunakan di:

- `handleSubmit`
- `handleEditSubmit`
- `handleDeleteConfirm`
- callback realtime

Ini menghindari kondisi data masuk database tetapi tampilan tetap memakai page/filter lama.

### 4. Tambahkan fallback polling ringan untuk VPS/self-hosted

Realtime tetap dipertahankan, tetapi ditambah fallback agar halaman tetap sinkron walaupun realtime VPS tidak aktif:

- Saat tab aktif dan halaman `/rekap-gaji-worker` terbuka, refetch otomatis setiap 10-15 detik.
- Saat user kembali ke tab (`visibilitychange`) atau window fokus kembali, refetch ulang.
- Tambahkan tombol manual `Refresh` kecil di header/filter untuk memaksa ambil data terbaru.

Ini membuat halaman tetap normal “di kondisi apapun”, termasuk jika Supabase realtime di VPS tidak berjalan.

### 5. Default bulan mengikuti bulan terbaru yang punya data

Update `fetchAvailableMonths()`:

- Ambil data bulan dari `worker_income` dan `salary_withdrawals`.
- Jika `selectedMonth` belum ada atau tidak ada di daftar bulan, otomatis pilih bulan paling terbaru yang tersedia.
- Tetap sediakan bulan sekarang sebagai fallback jika belum ada data sama sekali.

### 6. Perbaiki query worker/month agar aman untuk data besar

Untuk daftar worker dan daftar bulan, gunakan query terpisah dengan `.range()` atau loop batch agar tidak berhenti di 1000 row default Supabase.

### 7. Tambahkan error feedback yang lebih jelas

Jika fetch gagal, tampilkan pesan error yang spesifik dan jangan biarkan tabel terlihat seperti kosong tanpa alasan. Ini membantu debugging di VPS jika ada masalah RLS, URL Supabase berbeda, atau realtime belum aktif.

## File yang Akan Diubah

- `src/pages/RekapGajiWorker.tsx`

Tidak perlu migrasi database baru untuk fix utama ini. Perbaikan difokuskan ke frontend query dan strategi refresh, karena data sudah terbukti masuk ke Supabase tetapi query tampilan tidak mengambilnya dengan benar.

## Hasil yang Diharapkan

Setelah perbaikan:

- Data pengambilan gaji yang baru diinput langsung muncul di tabel.
- Data pada hari terakhir bulan tetap terbaca.
- Data tetap muncul walaupun VPS/Supabase realtime tidak aktif.
- Filter bulan otomatis mengikuti bulan yang benar.
- Tampilan tetap sinkron setelah tambah, edit, hapus, pindah tab, atau refresh manual.
- Lebih aman untuk VPS dengan timezone/server configuration berbeda.