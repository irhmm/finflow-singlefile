import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { TableType } from "@/components/FinancialDashboard";

const Index = () => {
  const [activeTable, setActiveTable] = useState<TableType>("admin_income");
  const location = useLocation();

  useEffect(() => {
    // Get table from URL path
    const path = location.pathname;
    if (path === '/pendapatan-admin') {
      setActiveTable('admin_income');
    } else if (path === '/pendapatan-worker') {
      setActiveTable('worker_income');
    } else if (path === '/pengeluaran') {
      setActiveTable('expenses');
    } else {
      // Default for root path - check URL parameters as fallback
      const urlParams = new URLSearchParams(location.search);
      const tab = urlParams.get('tab') as TableType;
      if (tab && ['admin_income', 'worker_income', 'expenses'].includes(tab)) {
        setActiveTable(tab);
      }
    }
  }, [location]);

  return <FinancialDashboard initialTable={activeTable} />;
};

export default Index;
