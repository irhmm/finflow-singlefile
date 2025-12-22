import { useEffect, useState } from "react";
import { FinancialDashboard } from "@/components/FinancialDashboard";
import { TableType } from "@/components/FinancialDashboard";

const Index = () => {
  const [activeTable, setActiveTable] = useState<TableType>("admin_income");

  useEffect(() => {
    // Get table from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab") as TableType;
    if (tab && ["admin_income", "worker_income", "expenses", "workers"].includes(tab)) {
      setActiveTable(tab);
    }
  }, []);

  return <FinancialDashboard initialTable={activeTable} />;
};

export default Index;
