"use client";

import { useParams, useSearchParams } from "next/navigation";

import CategoryDetailPage from "@/components/financial-explorer/CategoryDetailPage";

export default function CategoryDetailRoute() {
  const { category } = useParams<{ category: string }>();
  const query = useSearchParams();

  return (
    <CategoryDetailPage
      key={category}
      category={category}
      initialStartDate={query.get("startDate")}
      initialEndDate={query.get("endDate")}
    />
  );
}
