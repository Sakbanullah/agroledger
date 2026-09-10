"use client";

import styles from "./SaleConfirm.module.css";

interface Sale {
  id: number;
  saleDate: string;
  pricePerKg: string | null;
  totalWeightKg: string | null;
  buyerName: string | null;
  farm: {
    name: string;
  };
  commodity: {
    name: string;
  };
}

interface Props {
  sale: Sale;
  buyerName: string;
  pricePerKg: string;
  totalWeight: number;
  onBuyerChange: (value: string) => void;
  onPriceChange: (value: string) => void;
}

export default function SaleSummary({
  sale,
  buyerName,
  pricePerKg,
  totalWeight,
  onBuyerChange,
  onPriceChange,
}: Props) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>
            TRANSACTION
          </span>

          <h2>Informasi Penjualan</h2>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span>Tanggal</span>

          <strong>
            {new Date(
              sale.saleDate,
            ).toLocaleDateString("id-ID")}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span>Komoditas</span>

          <strong>
            {sale.commodity.name}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span>Kebun</span>

          <strong>
            {sale.farm.name}
          </strong>
        </div>

        <div className={styles.infoItem}>
          <span>Total Berat</span>

          <strong>
            {totalWeight.toLocaleString(
              "id-ID",
            )}{" "}
            kg
          </strong>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label>
          <span>Pembeli</span>

          <input
            value={buyerName}
            onChange={(event) =>
              onBuyerChange(
                event.target.value,
              )
            }
            placeholder="Nama pembeli"
          />
        </label>

        <label>
          <span>Harga Karet / Kg</span>

          <input
            type="number"
            min="1"
            value={pricePerKg}
            onChange={(event) =>
              onPriceChange(
                event.target.value,
              )
            }
            placeholder="Contoh: 18000"
          />
        </label>
      </div>
    </section>
  );
}