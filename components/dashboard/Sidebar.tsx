import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Leaf,
  MoreHorizontal,
  ReceiptText,
  Sprout,
  Settings,
  Users,
} from "lucide-react";

export default function Sidebar() {
  const navigation = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      active: true,
    },
    {
      label: "Transactions",
      icon: ReceiptText,
    },
    {
      label: "Harvest",
      icon: Sprout,
    },
    {
      label: "Settlement",
      icon: FileText,
    },
    {
      label: "Reports",
      icon: BarChart3,
    },
  ];

  return (
    <aside className="hidden w-[230px] shrink-0 border-r border-[#E5E7E4] bg-[#F7F7F2] lg:flex lg:flex-col">
      <div className="flex h-full flex-col px-4 py-5">
        <div className="flex items-center gap-3 px-3">
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
        </div>

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

        <div className="mt-auto space-y-1">
          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] hover:bg-white">
            <Users size={16} strokeWidth={1.8} />
            People
          </button>

          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-[13px] font-medium text-[#69726B] hover:bg-white">
            <Settings size={16} strokeWidth={1.8} />
            Settings
          </button>

          <div className="mt-4 border-t border-[#E5E7E4] pt-4">
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DDE5DD] text-xs font-semibold text-[#315B42]">
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

              <MoreHorizontal
                size={16}
                className="ml-auto text-[#9AA09B]"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}