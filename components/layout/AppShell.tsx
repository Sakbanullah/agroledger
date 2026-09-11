"use client";

import { useEffect, useState } from "react";

import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 72;

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(
      "agroledger-sidebar-collapsed",
    );

    if (saved === "true") {
      setCollapsed(true);
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem(
      "agroledger-sidebar-collapsed",
      String(collapsed),
    );
  }, [collapsed, mounted]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <MobileHeader
        onMenuClick={() => setMobileOpen(true)}
      />

      <main
        className="min-h-screen transition-[margin] duration-200 ease-out max-lg:!ml-0"
        style={{
          marginLeft: `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
        }}
      >
        <div className="min-h-screen pt-[57px] lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}