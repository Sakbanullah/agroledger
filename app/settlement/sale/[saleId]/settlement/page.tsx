import SaleSettlement from "@/components/settlement/sale-settlement/SaleSettlement";

interface SettlementPageProps {
  params: Promise<{
    saleId: string;
  }>;
}

export default async function SettlementPage({
  params,
}: SettlementPageProps) {
  const { saleId } = await params;

  return <SaleSettlement saleId={Number(saleId)} />;
}