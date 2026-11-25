"use client";

import { Suspense } from "react";

import TransactionListPage from "@/components/financial-explorer/TransactionListPage";

export default function TransactionsExplorerRoute() {
  return (
    <Suspense fallback={null}>
      <TransactionListPage />
    </Suspense>
  );
}
