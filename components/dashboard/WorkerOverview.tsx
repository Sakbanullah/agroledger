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
    <section className="rounded-[10px] border border-[#E5E7E4] bg-white">
      <div className="border-b border-[#ECEEEB] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A918B]">
              People
            </p>

            <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#17221B]">
              Workers
            </h2>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[#F2F4F1]">
            <Users size={15} className="text-[#59625B]" />
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex min-h-[150px] items-center justify-center">
            <p className="text-[11px] text-[#9AA19B]">Memuat worker...</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.04em] text-[#17221B]">
                  {totalWorkers}
                </p>

                <p className="mt-1 text-[11px] text-[#8A918B]">
                  Total worker terdaftar
                </p>
              </div>

              <span className="rounded-[5px] bg-[#F2F4F1] px-2 py-1 text-[10px] font-semibold text-[#59625B]">
                ACTIVE
              </span>
            </div>

            <div className="mt-5 border-t border-[#ECEEEB] pt-4">
              {workers.length === 0 ? (
                <div className="py-3">
                  <p className="text-[11px] font-medium text-[#59625B]">
                    Belum ada worker
                  </p>

                  <p className="mt-1 text-[10px] text-[#9AA19B]">
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
                      className="flex w-full items-center justify-between rounded-[7px] px-2 py-2 text-left transition hover:bg-[#FAFAF8]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F2F4F1] text-[10px] font-semibold text-[#59625B]">
                          {worker.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium text-[#17221B]">
                            {worker.name}
                          </p>

                          <p className="text-[9px] text-[#9AA19B]">Worker</p>
                        </div>
                      </div>

                      <ArrowRight
                        size={13}
                        className="shrink-0 text-[#9AA19B]"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/workers")}
              className="mt-4 flex w-full items-center justify-between border-t border-[#ECEEEB] pt-4 text-[11px] font-medium text-[#59625B] transition hover:text-[#17221B]"
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
