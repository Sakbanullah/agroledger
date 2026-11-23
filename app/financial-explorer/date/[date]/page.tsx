"use client";

import { useParams } from "next/navigation";

import DateExplorerPage from "@/components/financial-explorer/DateExplorerPage";

export default function DateExplorerRoute() {
  const params = useParams<{ date: string }>();

  return <DateExplorerPage key={params.date} date={params.date} />;
}
