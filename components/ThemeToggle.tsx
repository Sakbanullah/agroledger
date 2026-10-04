"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  collapsed?: boolean;
  className?: string;
};

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export default function ThemeToggle({
  collapsed = false,
  className = "",
}: ThemeToggleProps) {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("agroledger-theme", next ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Mode terang" : "Mode gelap"}
      className={`flex h-9 w-full items-center rounded-[9px] text-text-muted transition-colors hover:bg-surface hover:text-text-primary ${
        collapsed ? "justify-center" : "gap-3 px-3"
      } ${className}`}
    >
      {dark ? (
        <Sun size={16} strokeWidth={1.8} />
      ) : (
        <Moon size={16} strokeWidth={1.8} />
      )}

      {!collapsed && (
        <span className="text-[11px] font-medium">
          {dark ? "Mode terang" : "Mode gelap"}
        </span>
      )}
    </button>
  );
}
