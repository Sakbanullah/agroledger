import SaleManual from "@/components/settlement/sale-manual/SaleManual";

interface PageProps {
  params: Promise<{
    saleId: string;
  }>;
}

export default async function SaleManualPage({
  params,
}: PageProps) {
  const { saleId } = await params;

  return <SaleManual saleId={Number(saleId)} />;
}