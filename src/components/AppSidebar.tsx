import { CreditCard, Users, TrendingDown } from "lucide-react";
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
  activeTable: TableType;
  onTableChange: (table: TableType) => void;
}

const navigationItems = [
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

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistem Keuangan</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.table}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeTable === item.table}
                  >
                    <button
                      onClick={() => onTableChange(item.table)}
                      className="flex items-center gap-2 w-full"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
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