import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LaporanKeuangan from "./LaporanKeuangan";

const LaporanKeuanganLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          <LaporanKeuangan />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default LaporanKeuanganLayout;