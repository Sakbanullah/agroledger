import SettlementCheck from '@/components/settlement/SettlementCheck';

interface CheckPageProps {
  params: Promise<{
    saleId: string;
  }>;
}

export default async function CheckPage({
  params,
}: CheckPageProps) {
  const { saleId } = await params;

  return <SettlementCheck saleId={Number(saleId)} />;
}