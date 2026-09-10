"use client";

import { Plus } from "lucide-react";

export default function PageHeader() {
  return (
    <header className="border-b border-[#E5E7E4] pb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
            AgroLedger
          </p>

          <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.03em] text-[#17221B]">
            Overview
          </h1>

          <p className="mt-1 text-[12px] text-[#7A827C]">
            Ringkasan keuangan dan aktivitas usaha
          </p>
        </div>

        <button className="flex h-9 items-center justify-center gap-2 rounded-[7px] bg-[#17221B] px-3.5 text-[12px] font-semibold text-white transition hover:bg-[#253229]">
          <Plus size={15} />
          Add transaction
        </button>
      </div>
    </header>
  );
}