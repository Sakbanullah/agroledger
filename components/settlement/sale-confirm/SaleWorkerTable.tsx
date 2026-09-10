"use client";

import styles from "./SaleConfirm.module.css";

interface Worker {
  id: number;
  pieces: number;
  weightKg: string;
  worker: {
    id: number;
    name: string;
  };
}

interface Props {
  workers: Worker[];
  totalWeight: number;
}

export default function SaleWorkerTable({
  workers,
  totalWeight,
}: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>
            WORKERS
          </span>

          <h2>Daftar Pekerja</h2>
        </div>

        <div className={styles.totalWeight}>
          <span>Total berat</span>

          <strong>
            {totalWeight.toLocaleString("id-ID")} kg
          </strong>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Worker</th>
              <th>Keping</th>
              <th>Berat</th>
            </tr>
          </thead>

          <tbody>
            {workers.map((worker, index) => (
              <tr key={worker.id}>
                <td>{index + 1}</td>

                <td>
                  <strong>
                    {worker.worker.name}
                  </strong>
                </td>

                <td>
                  {worker.pieces}
                </td>

                <td>
                  {Number(
                    worker.weightKg,
                  ).toLocaleString("id-ID")}{" "}
                  kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}