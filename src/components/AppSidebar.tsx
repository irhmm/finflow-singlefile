import { CreditCard, Users, TrendingDown, BarChart3, LogOut, UserCheck, Wallet, CheckCircle2, Briefcase, ShieldCheck } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { TableType } from "./FinancialDashboard";

interface AppSidebarProps {
  activeTable: TableType | "laporan" | "rekap_gaji" | "worker_done" | "gaji_admin" | "admins";
  onTableChange: (table: TableType) => void;
}

// Keuangan Items
const keuanganItems = [
  {
    title: "Laporan Keuangan",
    icon: BarChart3,
    table: "laporan" as any,
    path: "/laporan-keuangan",
    isRoute: true,
  },
  {
    title: "Pengeluaran",
    icon: TrendingDown,
    table: "expenses" as TableType,
    isRoute: false,
  },
];

// Admin Items
const adminItems = [
  {
    title: "Pendapatan Admin",
    icon: CreditCard,
    table: "admin_income" as TableType,
    isRoute: false,
  },
  {
    title: "Data Admin",
    icon: ShieldCheck,
    table: "admins" as any,
    path: "/data-admin",
    isRoute: true,
    superAdminOnly: true,
  },
  {
    title: "Gaji Admin",
    icon: Briefcase,
    table: "gaji_admin" as any,
    path: "/gaji-admin",
    isRoute: true,
    superAdminOnly: true,
  },
];

// Worker Items
const workerItems = [
  {
    title: "Pendapatan Worker",
    icon: Users,
    table: "worker_income" as TableType,
    isRoute: false,
    publicAccess: true,
  },
  {
    title: "Data Worker",
    icon: UserCheck,
    table: "workers" as TableType,
    isRoute: false,
  },
  {
    title: "Rekap Gaji Worker",
    icon: Wallet,
    table: "rekap_gaji" as any,
    path: "/rekap-gaji-worker",
    isRoute: true,
    publicAccess: true,
  },
  {
    title: "Worker Done",
    icon: CheckCircle2,
    table: "worker_done" as any,
    path: "/worker-done",
    isRoute: true,
  },
];

export function AppSidebar({ activeTable, onTableChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { signOut, user, userRole } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout berhasil!');
    } catch (error) {
      toast.error('Gagal logout');
    }
  };

  // Filter items based on role
  const getVisibleKeuanganItems = () => {
    if (!user || userRole === 'public' || userRole === 'admin') return [];
    if (userRole === 'admin_keuangan' || userRole === 'super_admin') return keuanganItems;
    return [];
  };

  const getVisibleAdminItems = () => {
    if (!user || userRole === 'public') return [];
    if (userRole === 'admin') {
      return adminItems.filter(item => item.table === 'admin_income');
    }
    if (userRole === 'super_admin') return adminItems;
    return [];
  };

  const getVisibleWorkerItems = () => {
    if (!user) {
      return workerItems.filter(item => item.publicAccess);
    }
    if (userRole === 'public') {
      return workerItems.filter(item => item.publicAccess);
    }
    if (userRole === 'admin') {
      return workerItems.filter(item => 
        item.table === 'worker_income' || item.table === 'rekap_gaji'
      );
    }
    if (userRole === 'admin_keuangan') {
      return workerItems;
    }
    if (userRole === 'super_admin') {
      return workerItems;
    }
    return workerItems.filter(item => item.publicAccess);
  };

  const visibleKeuangan = getVisibleKeuanganItems();
  const visibleAdmin = getVisibleAdminItems();
  const visibleWorker = getVisibleWorkerItems();

  const renderMenuItem = (item: typeof workerItems[0]) => (
    <SidebarMenuItem key={item.table}>
      <SidebarMenuButton
        asChild
        isActive={activeTable === item.table}
        className="hover:bg-secondary/10 hover:text-secondary data-[active=true]:bg-secondary data-[active=true]:text-white"
      >
        {item.isRoute ? (
          <NavLink
            to={item.path || '/'}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors"
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ) : (
          <button
            onClick={() => {
              onTableChange(item.table);
              navigate(`/?tab=${item.table}`);
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors"
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.title}</span>
          </button>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-secondary/20">
      <SidebarContent className="bg-gradient-to-b from-card to-secondary/5">
        {/* Header with role badge */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-header font-semibold flex items-center justify-between">
            Sistem Keuangan
            {user && (
              <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                {userRole === 'super_admin' ? 'Super Admin' : 
                 userRole === 'admin' ? 'Admin' : 
                 userRole === 'admin_keuangan' ? 'Admin Keuangan' : 
                 userRole === 'public' ? 'Public' : 'User'}
              </span>
            )}
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* Keuangan - PALING ATAS */}
        {visibleKeuangan.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              📊 Keuangan
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleKeuangan.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Admin */}
        {visibleAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              🏢 Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdmin.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Worker */}
        {visibleWorker.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              👥 Worker
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleWorker.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Akun - Logout */}
        {user && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              👤 Akun
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
