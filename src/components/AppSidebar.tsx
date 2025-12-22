import { CreditCard, Users, TrendingDown, BarChart3, LogOut, UserCheck, Wallet, CheckCircle2, Briefcase, ShieldCheck, Building2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'admin_keuangan': return 'Admin Keuangan';
    case 'public': return 'Public';
    default: return 'User';
  }
};

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

  const menuItemClasses = cn(
    "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
    "text-sidebar-foreground/80 font-medium text-sm",
    "transition-all duration-200 ease-out",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "group"
  );

  const activeMenuClasses = cn(
    "bg-sidebar-accent text-sidebar-accent-foreground",
    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
    "before:w-1 before:h-6 before:bg-sidebar-primary before:rounded-r-full"
  );

  const renderMenuItem = (item: typeof workerItems[0]) => {
    const isActive = activeTable === item.table;
    
    return (
      <SidebarMenuItem key={item.table}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={cn(
            "p-0 h-auto font-normal",
            "hover:bg-transparent data-[active=true]:bg-transparent"
          )}
        >
          {item.isRoute ? (
            <NavLink
              to={item.path || '/'}
              className={cn(menuItemClasses, isActive && activeMenuClasses)}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span>{item.title}</span>
            </NavLink>
          ) : (
            <button
              onClick={() => {
                onTableChange(item.table);
                navigate(`/?tab=${item.table}`);
              }}
              className={cn(menuItemClasses, isActive && activeMenuClasses)}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span>{item.title}</span>
            </button>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const CategoryLabel = ({ children }: { children: React.ReactNode }) => (
    <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.12em] text-sidebar-foreground/50 font-semibold px-3 mb-1">
      {children}
    </SidebarGroupLabel>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar-background">
        {/* Elegant Header */}
        <div className="px-4 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shadow-md">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
                Sistem Keuangan
              </span>
              {user && (
                <span className="text-[11px] text-sidebar-foreground/50 font-medium">
                  {getRoleDisplayName(userRole)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 py-4 space-y-6">
          {/* Keuangan */}
          {visibleKeuangan.length > 0 && (
            <SidebarGroup className="px-2">
              <CategoryLabel>Keuangan</CategoryLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {visibleKeuangan.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Admin */}
          {visibleAdmin.length > 0 && (
            <SidebarGroup className="px-2">
              <CategoryLabel>Admin</CategoryLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {visibleAdmin.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Worker */}
          {visibleWorker.length > 0 && (
            <SidebarGroup className="px-2">
              <CategoryLabel>Worker</CategoryLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {visibleWorker.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>

        {/* Logout Section - Fixed at bottom */}
        {user && (
          <div className="mt-auto border-t border-sidebar-border p-3">
            <button
              onClick={handleSignOut}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
                "text-sidebar-foreground/70 text-sm font-medium",
                "transition-all duration-200",
                "hover:bg-destructive/10 hover:text-destructive"
              )}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
