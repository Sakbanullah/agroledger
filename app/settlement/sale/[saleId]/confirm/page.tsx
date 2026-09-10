import SaleConfirm from "@/components/settlement/sale-confirm/SaleConfirm";

interface ConfirmPageProps {
  params: Promise<{
    saleId: string;
  }>;
}

export default async function ConfirmPage({
  params,
}: ConfirmPageProps) {
  const { saleId } = await params;

  return <SaleConfirm saleId={Number(saleId)} />;
}