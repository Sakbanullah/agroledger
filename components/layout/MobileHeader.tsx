"use client";

import { Leaf, Menu } from "lucide-react";

type MobileHeaderProps = {
  onMenuClick: () => void;
};

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[57px] items-center justify-between border-b border-border bg-[#F7F8F5]/95 px-5 backdrop-blur lg:hidden">
      <button
        type="button"
        className="flex items-center gap-2.5"
        onClick={() => window.location.assign("/")}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#17221B] text-white">
          <Leaf size={15} strokeWidth={2} />
        </div>

        <span className="text-[14px] font-semibold tracking-[-0.02em] text-text-primary">
          AgroLedger
        </span>
      </button>

      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Buka menu"
        className="flex h-9 w-9 items-center justify-center rounded-[9px] text-text-secondary transition hover:bg-white hover:text-text-primary"
      >
        <Menu size={19} strokeWidth={1.8} />
      </button>
    </header>
  );
}
