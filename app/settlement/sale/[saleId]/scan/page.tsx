"use client";

import { useParams } from "next/navigation";

import RubberNoteScan from "@/components/settlement/RubberNoteScan";

export default function ScanPage() {
  const params = useParams<{ saleId: string }>();

  const saleId = Number(params.saleId);

  return <RubberNoteScan saleId={saleId} />;
}