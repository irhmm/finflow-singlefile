import { CreditCard, Users, TrendingDown, BarChart3, Menu, LogOut, UserCheck, Wallet } from "lucide-react";
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
  activeTable: TableType | "laporan" | "rekap_gaji";
  onTableChange: (table: TableType) => void;
}

const navigationItems = [
  {
    title: "Pendapatan Worker", 
    icon: Users,
    table: "worker_income" as TableType,
    isRoute: false,
    publicAccess: true
  },
  {
    title: "Pendapatan Admin",
    icon: CreditCard,
    table: "admin_income" as TableType,
    isRoute: false,
    publicAccess: false
  },
  {
    title: "Pengeluaran",
    icon: TrendingDown,
    table: "expenses" as TableType,
    isRoute: false,
    publicAccess: false
  },
  {
    title: "Data Worker",
    icon: UserCheck,
    table: "workers" as TableType,
    isRoute: false,
    publicAccess: false
  },
  {
    title: "Laporan Keuangan",
    icon: BarChart3,
    table: "laporan" as any,
    path: "/laporan-keuangan",
    isRoute: true,
    publicAccess: false
  },
  {
    title: "Rekap Gaji Worker",
    icon: Wallet,
    table: "rekap_gaji" as any,
    path: "/rekap-gaji-worker",
    isRoute: true,
    publicAccess: false
  }
];

export function AppSidebar({ activeTable, onTableChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { signOut, user, userRole, isAdmin, isSuperAdmin } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout berhasil!');
    } catch (error) {
      toast.error('Gagal logout');
    }
  };

  // Filter navigation items based on role permissions
  const getVisibleItems = () => {
    if (!user) {
      // Anonymous users: worker_income and rekap_gaji
      return navigationItems.filter(item => 
        item.table === 'worker_income' || 
        item.table === 'rekap_gaji'
      );
    }
    
    if (userRole === 'public') {
      // Public role: only worker_income and rekap_gaji (read only)
      return navigationItems.filter(item => 
        item.table === 'worker_income' || 
        item.table === 'rekap_gaji'
      );
    }
    
    if (userRole === 'admin') {
      // Admin: worker_income, admin_income, and rekap_gaji access
      return navigationItems.filter(item => 
        item.table === 'worker_income' || 
        item.table === 'admin_income' || 
        item.table === 'rekap_gaji'
      );
    }
    
    if (userRole === 'admin_keuangan') {
      // Admin Keuangan: full access to all financial tables
      return navigationItems.filter(item => 
        item.table === 'worker_income' || 
        item.table === 'admin_income' || 
        item.table === 'expenses' || 
        item.table === 'workers' || 
        item.table === 'rekap_gaji'
      );
    }
    
    if (userRole === 'super_admin') {
      // Super admin: all tables
      return navigationItems;
    }
    
    // Default: only worker_income
    return navigationItems.filter(item => item.table === 'worker_income');
  };

  const filteredItems = getVisibleItems();

  return (
    <Sidebar collapsible="icon" className="border-r border-secondary/20">
      <SidebarContent className="bg-gradient-to-b from-card to-secondary/5">
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
          
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
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
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
    
    {user && (
      <SidebarGroup>
        <SidebarGroupLabel>Akun</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleSignOut}>
                <LogOut />
                <span>Logout</span>
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