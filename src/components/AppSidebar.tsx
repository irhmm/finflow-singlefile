import { CreditCard, Users, TrendingDown, FileText, Home } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
  activeTable?: TableType;
  onTableChange?: (table: TableType) => void;
}

const pageNavigation = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/"
  },
  {
    title: "Laporan Keuangan",
    icon: FileText,
    url: "/laporan-keuangan"
  }
];

const tableNavigation = [
  {
    title: "Pendapatan Admin",
    icon: CreditCard,
    table: "admin_income" as TableType
  },
  {
    title: "Pendapatan Worker", 
    icon: Users,
    table: "worker_income" as TableType
  },
  {
    title: "Pengeluaran",
    icon: TrendingDown,
    table: "expenses" as TableType
  }
];

export function AppSidebar({ activeTable, onTableChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isTableActive = (table: TableType) => activeTable === table && currentPath === "/";

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-secondary/20">
      <SidebarContent className="bg-gradient-to-b from-sidebar to-secondary/5">
        {/* Page Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-header-primary font-semibold">
            Navigasi
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {pageNavigation.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="hover:bg-secondary/20 data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
                  >
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-3 w-full transition-colors duration-200"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Table Navigation - only show on dashboard */}
        {currentPath === "/" && onTableChange && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-header-primary font-semibold">
              Kelola Data
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tableNavigation.map((item) => (
                  <SidebarMenuItem key={item.table}>
                    <SidebarMenuButton
                      isActive={isTableActive(item.table)}
                      className="hover:bg-secondary/20 data-[active=true]:bg-secondary data-[active=true]:text-secondary-foreground"
                      onClick={() => onTableChange(item.table)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}