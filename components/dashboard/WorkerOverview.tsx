"use client";

import { ArrowRight, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Worker = {
  id: number;
  name: string;
  phone?: string | null;
  type: string;
};

export default function WorkerOverview() {
  const router = useRouter();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkers() {
      try {
        const response = await fetch("http://localhost:3001/workers", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil data worker");
        }

        const data = await response.json();

        setWorkers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Worker overview error:", error);
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    }

    loadWorkers();
  }, []);

  const totalWorkers = workers.length;

  return (
    <section className="rounded-[10px] border border-border bg-surface">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              People
            </p>

            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-text-primary">
              Workers
            </h2>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-surface-soft">
            <Users size={15} className="text-text-secondary" />
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex min-h-[150px] items-center justify-center">
            <p className="text-[11px] text-text-muted">Memuat worker...</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.04em] text-text-primary">
                  {totalWorkers}
                </p>

                <p className="mt-1 text-[11px] text-text-muted">
                  Total worker terdaftar
                </p>
              </div>

              <span className="rounded-[5px] bg-surface-soft px-2 py-1 text-[10px] font-semibold text-text-secondary">
                ACTIVE
              </span>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              {workers.length === 0 ? (
                <div className="py-3">
                  <p className="text-[11px] font-medium text-text-secondary">
                    Belum ada worker
                  </p>

                  <p className="mt-1 text-[10px] text-text-muted">
                    Worker yang ditambahkan akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workers.slice(0, 3).map((worker) => (
                    <button
                      key={worker.id}
                      type="button"
                      onClick={() => router.push(`/workers`)}
                      className="flex w-full items-center justify-between rounded-[7px] px-2 py-2 text-left transition hover:bg-surface-muted"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-[10px] font-semibold text-text-secondary">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-text-primary">
                            {worker.name}
                          </p>

                          <p className="text-[9px] text-text-muted">Worker</p>
                        </div>
                      </div>

                      <ArrowRight
                        size={13}
                        className="shrink-0 text-text-muted"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/workers")}
              className="mt-4 flex w-full items-center justify-between border-t border-border pt-4 text-[11px] font-medium text-text-secondary transition hover:text-text-primary"
            >
              <span>Lihat semua worker</span>

              <ArrowRight size={13} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
