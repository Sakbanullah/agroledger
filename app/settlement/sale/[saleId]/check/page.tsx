import RubberNoteScan from '@/components/settlement/RubberNoteScan';

interface ScanPageProps {
  params: Promise<{
    saleId: string;
  }>;
}

export default async function ScanPage({
  params,
}: ScanPageProps) {
  const { saleId } = await params;

  return (
    <RubberNoteScan
      saleId={Number(saleId)}
    />
  );
}