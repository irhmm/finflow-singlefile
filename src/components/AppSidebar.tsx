import { CreditCard, Users, TrendingDown, BarChart3, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
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
  activeTable: TableType | "laporan";
  onTableChange: (table: TableType) => void;
}

const navigationItems = [
  {
    title: "Pendapatan Admin",
    icon: CreditCard,
    table: "admin_income" as TableType,
    path: "/?tab=admin_income"
  },
  {
    title: "Pendapatan Worker", 
    icon: Users,
    table: "worker_income" as TableType,
    path: "/?tab=worker_income"
  },
  {
    title: "Pengeluaran",
    icon: TrendingDown,
    table: "expenses" as TableType,
    path: "/?tab=expenses"
  },
  {
    title: "Laporan Keuangan",
    icon: BarChart3,
    table: "laporan" as any,
    path: "/laporan-keuangan"
  }
];

export function AppSidebar({ activeTable, onTableChange }: AppSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="border-r border-secondary/20">
      <SidebarContent className="bg-gradient-to-b from-card to-secondary/5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-header font-semibold">
            Sistem Keuangan
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.table}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeTable === item.table}
                    className="hover:bg-secondary/10 hover:text-secondary data-[active=true]:bg-secondary data-[active=true]:text-white"
                  >
                    {item.path.startsWith("/") ? (
                      <NavLink
                        to={item.path}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors"
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    ) : (
                      <button
                        onClick={() => {
                          if (item.table !== "laporan") {
                            onTableChange(item.table);
                          }
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
      </SidebarContent>
    </Sidebar>
  );
}