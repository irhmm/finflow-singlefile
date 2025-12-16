import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminModal } from "@/components/AdminModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { Plus, Search, Users, UserCheck, UserX, Pencil, Trash2 } from "lucide-react";

interface Admin {
  id: number;
  nama: string;
  code: string;
  gaji_pokok: number;
  no_rek: string | null;
  nomor: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const DataAdmin = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("*")
        .order("code", { ascending: true });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error: any) {
      toast.error("Gagal memuat data admin: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(admin =>
    admin.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const paginatedAdmins = filteredAdmins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalAdmin = admins.length;
  const activeAdmin = admins.filter(a => a.status === "aktif").length;
  const inactiveAdmin = admins.filter(a => a.status === "non aktif").length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setIsModalOpen(true);
  };

  const handleDelete = (admin: Admin) => {
    setAdminToDelete(admin);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;
    try {
      const { error } = await supabase
        .from("admins")
        .delete()
        .eq("id", adminToDelete.id);

      if (error) throw error;
      toast.success("Admin berhasil dihapus");
      fetchAdmins();
    } catch (error: any) {
      toast.error("Gagal menghapus admin: " + error.message);
    } finally {
      setDeleteModalOpen(false);
      setAdminToDelete(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAdmin(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    fetchAdmins();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar activeTable="admins" onTableChange={() => {}} />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold text-foreground">Data Admin</h1>
          </header>

          <main className="flex-1 p-4 lg:p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Admin</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalAdmin}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aktif</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeAdmin}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-500/10">
                    <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Non Aktif</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{inactiveAdmin}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search & Add Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau code admin..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Admin
              </Button>
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                {/* Desktop Table */}
                <Table className="hidden md:table">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Nama Admin</TableHead>
                      <TableHead className="text-center">Code</TableHead>
                      <TableHead className="text-right">Gaji Pokok</TableHead>
                      <TableHead>No. Rekening</TableHead>
                      <TableHead>Nomor HP</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : paginatedAdmins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Tidak ada data admin
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAdmins.map((admin, index) => (
                        <TableRow key={admin.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-center font-medium text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{admin.nama}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono">
                              {admin.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(admin.gaji_pokok)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {admin.no_rek || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {admin.nomor || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={admin.status === "aktif" ? "default" : "secondary"} 
                              className={admin.status === "aktif" 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }>
                              {admin.status === "aktif" ? "Aktif" : "Non Aktif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)}>
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(admin)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground">Memuat data...</p>
                  ) : paginatedAdmins.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">Tidak ada data admin</p>
                  ) : (
                    paginatedAdmins.map((admin, index) => (
                      <Card key={admin.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                              <Badge variant="outline" className="font-mono">{admin.code}</Badge>
                              <Badge variant={admin.status === "aktif" ? "default" : "secondary"}
                                className={admin.status === "aktif" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }>
                                {admin.status === "aktif" ? "Aktif" : "Non Aktif"}
                              </Badge>
                            </div>
                            <p className="font-semibold mt-1">{admin.nama}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(admin)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(admin)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Gaji Pokok</p>
                            <p className="font-medium">{formatCurrency(admin.gaji_pokok)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">No. Rekening</p>
                            <p className="font-medium">{admin.no_rek || "-"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Nomor HP</p>
                            <p className="font-medium">{admin.nomor || "-"}</p>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          </main>
        </SidebarInset>
      </div>

      <AdminModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editData={editingAdmin}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setAdminToDelete(null);
        }}
        onConfirm={confirmDelete}
        recordType={`admin "${adminToDelete?.nama}"`}
      />
    </SidebarProvider>
  );
};

export default DataAdmin;