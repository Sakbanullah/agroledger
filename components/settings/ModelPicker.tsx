"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { LlmModelOption } from "@/lib/api";

/**
 * Picks a model from what the provider actually advertises. A saved id that is
 * not in the fetched list is still shown, so a failed or partial fetch never
 * makes an existing configuration look empty.
 */
export default function ModelPicker({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: string;
  options: LlmModelOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matches = options.filter(
      (option) =>
        !q ||
        option.id.toLowerCase().includes(q) ||
        option.displayName?.toLowerCase().includes(q),
    );

    // Keep the current value reachable even when the provider no longer lists it.
    const missing =
      value && !matches.some((option) => option.id === value) && !q
        ? [{ id: value, displayName: null }, ...matches]
        : matches;

    return missing;
  }, [options, query, value]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && filtered[active]) {
      event.preventDefault();
      choose(filtered[active].id);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-[9px] border border-border bg-surface px-3 text-left text-sm text-text-primary outline-none focus-visible:border-agro-primary focus-visible:ring-2 focus-visible:ring-agro-primary-soft disabled:opacity-60"
      >
        <span className={`truncate ${value ? "" : "text-text-muted"}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-text-muted" />
      </button>

      {/* Wider than the trigger: model ids are long and the row is narrow. */}
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-max min-w-full max-w-[min(460px,90vw)] overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={13} className="shrink-0 text-text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Cari model..."
              className="h-9 w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <ul
            id={listId}
            role="listbox"
            className="max-h-60 min-w-[260px] overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-[12px] text-text-muted">
                Tidak ada model yang cocok.
              </li>
            )}

            {filtered.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] transition ${
                    index === active ? "bg-surface-soft" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-text-primary">
                      {option.id}
                    </span>
                    {option.displayName && (
                      <span className="block truncate text-[11px] text-text-muted">
                        {option.displayName}
                      </span>
                    )}
                  </span>
                  {option.id === value && (
                    <Check size={13} className="shrink-0 text-success" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
