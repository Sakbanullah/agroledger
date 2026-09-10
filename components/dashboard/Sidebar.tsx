"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Leaf,
  MoreHorizontal,
  ReceiptText,
  Settings,
  Sprout,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();

  const navigation = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      active: true,
      path: "/",
    },
    {
      label: "Transactions",
      icon: ReceiptText,
      path: "/transactions",
    },
    {
      label: "Harvest",
      icon: Sprout,
      path: "/harvest",
    },
    {
      label: "Settlement",
      icon: FileText,
      path: "/settlement",
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: "/reports",
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] border-r border-[#E5E7E4] bg-[#F7F7F2] lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-5">
        {/* Brand */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-3 px-3 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#17221B] text-white">
            <Leaf size={16} strokeWidth={2} />
          </div>

          <div>
            <p className="text-[15px] font-semibold tracking-tight text-[#17221B]">
              AgroLedger
            </p>

            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A918B]">
              Family Finance
            </p>
          </div>
        </button>

        {/* Workspace */}
        <div className="mt-10">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929992]">
            Workspace
          </p>

          <nav className="mt-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => router.push(item.path)}
                  className={`flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium transition ${
                    item.active
                      ? "bg-[#17221B] text-white"
                      : "text-[#69726B] hover:bg-white hover:text-[#17221B]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-auto space-y-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929992]">
            People
          </p>

          <button
            type="button"
            onClick={() => router.push("/workers")}
            className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] transition hover:bg-white hover:text-[#17221B]"
          >
            <Users size={16} strokeWidth={1.8} />
            Workers
          </button>

          <button
            type="button"
            onClick={() => router.push("/credit")}
            className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] transition hover:bg-white hover:text-[#17221B]"
          >
            <ReceiptText size={16} strokeWidth={1.8} />
            Kasbon
          </button>

          <div className="mt-3 border-t border-[#E5E7E4] pt-3">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929992]">
              System
            </p>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] transition hover:bg-white hover:text-[#17221B]"
            >
              <Settings size={16} strokeWidth={1.8} />
              Settings
            </button>
          </div>

          {/* Account */}
          <div className="mt-4 border-t border-[#E5E7E4] pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDE5DD] text-xs font-semibold text-[#315B42]">
                SD
              </div>

              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#17221B]">
                  Family Account
                </p>

                <p className="text-[11px] text-[#8A918B]">
                  Owner
                </p>
              </div>

              <button
                type="button"
                className="ml-auto rounded-md p-1 text-[#9AA09B] transition hover:bg-white hover:text-[#59625B]"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}