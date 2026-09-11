import FarmList from "@/components/farm/FarmList";

export default function FarmPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 pb-8 pt-5 sm:px-5 sm:pb-10 sm:pt-6 lg:px-7">
      <div className="w-full">
        <FarmList />
      </div>
    </main>
  );
}