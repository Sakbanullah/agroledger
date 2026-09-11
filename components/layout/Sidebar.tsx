"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Leaf,
  MoreHorizontal,
  ReceiptText,
  Settings,
  Sprout,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const navigation = [
  {
    section: "Workspace",
    items: [
      {
        label: "Overview",
        icon: LayoutDashboard,
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
    ],
  },
  {
    section: "People",
    items: [
      {
        label: "Workers",
        icon: Users,
        path: "/workers",
      },
      {
        label: "Kasbon",
        icon: ReceiptText,
        path: "/credit",
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        label: "Settings",
        icon: Settings,
        path: "/settings",
      },
    ],
  },
];

function isActivePath(pathname: string, path: string) {
  if (path === "/") {
    return pathname === "/";
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (path: string) => {
    router.push(path);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex flex-col
          border-r border-border
          bg-[#F7F8F5]
          transition-[width,transform] duration-200 ease-out
          ${
            mobileOpen
              ? "translate-x-0 w-[250px]"
              : "-translate-x-full w-[250px]"
          }
          lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-[240px]"}
        `}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* BRAND */}
          <div
            className={`
              flex h-[76px] shrink-0 items-center
              border-b border-border
              ${collapsed ? "justify-center px-3" : "px-5"}
            `}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="group flex min-w-0 items-center"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#17221B] text-white">
                <Leaf size={17} strokeWidth={2} />
              </div>

              {!collapsed && (
                <div className="ml-3 min-w-0 text-left">
                  <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-text-primary">
                    AgroLedger
                  </p>

                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.13em] text-text-muted">
                    Family Finance
                  </p>
                </div>
              )}
            </button>
          </div>

          {/* NAVIGATION */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            {navigation.map((group, groupIndex) => (
              <div
                key={group.section}
                className={groupIndex === 0 ? "" : "mt-7"}
              >
                {!collapsed && (
                  <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                    {group.section}
                  </p>
                )}

                {collapsed && groupIndex > 0 && (
                  <div className="mx-auto mb-3 h-px w-8 bg-border" />
                )}

                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActivePath(pathname, item.path);

                    return (
                      <button
                        key={item.path}
                        type="button"
                        title={collapsed ? item.label : undefined}
                        onClick={() => navigate(item.path)}
                        className={`
                          group relative flex w-full items-center
                          rounded-[10px]
                          text-[12px] font-medium
                          transition-colors duration-150
                          ${
                            collapsed
                              ? "h-10 justify-center px-0"
                              : "h-10 gap-3 px-3"
                          }
                          ${
                            active
                              ? "bg-[#E6EFE2] text-[#3F7635]"
                              : "text-text-secondary hover:bg-white hover:text-text-primary"
                          }
                        `}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-agro-primary" />
                        )}

                        <Icon
                          size={16}
                          strokeWidth={active ? 2 : 1.8}
                          className="shrink-0"
                        />

                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* ACCOUNT */}
          <div className="shrink-0 border-t border-border p-3">
            {/* COLLAPSE */}
            <button
              type="button"
              onClick={onToggle}
              className={`
                mb-3 flex h-9 w-full items-center
                rounded-[9px]
                text-text-muted
                transition-colors
                hover:bg-white hover:text-text-primary
                ${collapsed ? "justify-center" : "gap-3 px-3"}
              `}
              title={collapsed ? "Perbesar sidebar" : "Kecilkan sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={16} strokeWidth={1.8} />
              ) : (
                <>
                  <ChevronLeft size={16} strokeWidth={1.8} />

                  <span className="text-[11px] font-medium">
                    Kecilkan sidebar
                  </span>
                </>
              )}
            </button>

            {/* ACCOUNT CARD */}
            <div
              className={`
                flex items-center rounded-[10px] bg-white
                ${collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2"}
              `}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDE8D9] text-[10px] font-semibold text-[#3F7635]">
                SD
              </div>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-text-primary">
                      Family Account
                    </p>

                    <p className="mt-0.5 text-[10px] text-text-muted">Owner</p>
                  </div>

                  <button
                    type="button"
                    className="rounded-md p-1 text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                    title="Account menu"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
