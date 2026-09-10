import { Leaf, Menu } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="flex items-center justify-between border-b border-[#E5E7E4] px-5 py-4 lg:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17221B] text-white">
          <Leaf size={16} />
        </div>

        <span className="text-[15px] font-semibold text-[#17221B]">
          AgroLedger
        </span>
      </div>

      <button className="rounded-lg p-2 text-[#69726B]">
        <Menu size={20} />
      </button>
    </header>
  );
}