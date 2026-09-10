import styles from "./SaleList.module.css";

interface SaleCardProps {
  sale: {
    id: number;
    saleDate: string;
    pricePerKg: string | null;
    totalWeightKg: string | null;
    buyerName: string | null;
    status: string;

    farm: {
      name: string;
      location: string;
    };

    commodity: {
      name: string;
      unit: string;
    };
  };

  formattedDate: string;
  formattedWeight: string;
  onClick: () => void;
}

export default function SaleCard({
  sale,
  formattedDate,
  formattedWeight,
  onClick,
}: SaleCardProps) {
  const price = sale.pricePerKg
    ? Number(sale.pricePerKg)
    : null;

  const weight = sale.totalWeightKg
    ? Number(sale.totalWeightKg)
    : 0;

  const totalValue =
    price !== null
      ? weight * price
      : null;

  const isPending =
    sale.status === "PENDING";

  const formatRupiah = (
    value: number | null,
  ) => {
    if (value === null) {
      return "-";
    }

    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <article
      className={styles.saleCard}
      onClick={onClick}
    >
      <div className={styles.cardMain}>

        {/* TOP */}
        <div className={styles.cardTop}>
          <div>
            <div className={styles.commodity}>
              {sale.commodity.name}
            </div>

            <div className={styles.date}>
              {formattedDate}
            </div>
          </div>

          <span
            className={
              isPending
                ? styles.statusPending
                : styles.statusCompleted
            }
          >
            {isPending
              ? "DRAFT"
              : "COMPLETED"}
          </span>
        </div>

        {/* METRICS */}
        <div className={styles.metrics}>
          <div className={styles.metric}>
            <span>Berat</span>

            <strong>
              {formattedWeight}{" "}
              {sale.commodity.unit.toLowerCase()}
            </strong>
          </div>

          <div className={styles.metric}>
            <span>Harga / Kg</span>

            <strong>
              {formatRupiah(price)}
            </strong>
          </div>

          <div className={styles.metric}>
            <span>Total Penjualan</span>

            <strong>
              {formatRupiah(totalValue)}
            </strong>
          </div>
        </div>

        {/* FOOTER */}
        <div className={styles.cardFooter}>
          <div>
            <span className={styles.farmName}>
              {sale.farm.name}
            </span>

            <span className={styles.location}>
              {sale.farm.location}
            </span>
          </div>

          <button
            type="button"
            className={styles.detailButton}
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            {isPending
              ? "Lanjutkan"
              : "Lihat Detail"}

            <span>→</span>
          </button>
        </div>
      </div>
    </article>
  );
}