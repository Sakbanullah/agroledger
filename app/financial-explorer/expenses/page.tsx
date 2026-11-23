"use client";

import DailyExplorerPage from "@/components/financial-explorer/DailyExplorerPage";

export default function ExpenseExplorerPage() {
  return (
    <DailyExplorerPage
      direction="OUT"
      title="Pengeluaran"
      subtitle="Uang yang benar-benar keluar dari kas Anda"
    />
  );
}
