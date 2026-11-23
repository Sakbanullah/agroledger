"use client";

import { useParams } from "next/navigation";

import TransactionDetailPage from "@/components/financial-explorer/TransactionDetailPage";

export default function TransactionDetailRoute() {
  const { id } = useParams<{ id: string }>();

  return <TransactionDetailPage key={id} id={Number(id)} />;
}
