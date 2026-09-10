import { ChevronDown, Plus } from "lucide-react";

export default function PageHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-[#E5E7E4] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-medium text-[#8A918B]">
          Wednesday, 9 September 2026
        </p>

        <h1 className="mt-1 text-[23px] font-semibold tracking-[-0.025em] text-[#17221B]">
          Overview
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="flex h-9 items-center gap-2 rounded-[7px] border border-[#DCDFDA] bg-white px-3 text-[12px] font-medium text-[#59625B] hover:bg-[#FAFAF8]">
          September 2026
          <ChevronDown size={14} />
        </button>

        <button className="flex h-9 items-center gap-2 rounded-[7px] bg-[#17221B] px-3.5 text-[12px] font-semibold text-white hover:bg-[#253229]">
          <Plus size={15} />
          Add transaction
        </button>
      </div>
    </div>
  );
}