import CreditDetail from "@/components/credit/credit-detail/CreditDetail";

interface CreditDetailPageProps {
  params: Promise<{
    workerId: string;
  }>;
}

export default async function CreditDetailPage({
  params,
}: CreditDetailPageProps) {
  const { workerId } = await params;

  return <CreditDetail workerId={Number(workerId)} />;
}