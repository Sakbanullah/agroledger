'use client';

import { useEffect, useState } from 'react';
import './SettlementCheck.css';

type SettlementCheck = {
  settlementId: number;

  sale: {
    saleId: number;
    saleDate: string;
  };

  worker: {
    workerId: number;
    name: string;
  };

  calculation: {
    pieces: number;
    weightKg: number;
    pricePerKg: number;
    grossValue: number;
    workerShare: number;
    kasbon: number;
    deduction: number;
    netAmount: number;
    balanceAfterSale: number;
  };

  status: string;
};

interface SettlementCheckProps {
  saleId: number;
}

export default function SettlementCheck({
  saleId,
}: SettlementCheckProps) {
  const [checks, setChecks] = useState<SettlementCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChecks = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          `http://localhost:3001/settlements/sale/${saleId}/check`,
        );

        if (!response.ok) {
          throw new Error('Gagal mengambil data check');
        }

        const data = await response.json();

        setChecks(data);
      } catch (err) {
        console.error(err);
        setError('Gagal mengambil data check');
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
  }, [saleId]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="check-loading">
        Memuat check...
      </div>
    );
  }

  if (error) {
    return (
      <div className="check-error">
        {error}
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="check-empty">
        Belum ada check.
      </div>
    );
  }

  return (
    <>
      <div className="print-actions">
        <button
          type="button"
          onClick={() => window.print()}
          className="print-button"
        >
          Cetak Check
        </button>
      </div>

      <div className="checks-page">
        {checks.map((check) => {
          const isDebt =
            check.calculation.balanceAfterSale < 0;

          const debtAmount = Math.abs(
            check.calculation.balanceAfterSale,
          );

          return (
            <div
              key={check.settlementId}
              className="settlement-check"
            >
              {/* HEADER */}
              <div className="check-header">
                <div className="brand">
                  AgroLedger
                </div>

                <div className="document-title">
                  BUKTI PEMBAYARAN
                </div>
              </div>

              <div className="header-line" />

              {/* NAMA + TANGGAL */}
              <div className="identity-section">
                <div>
                  <div className="label">
                    NAMA
                  </div>

                  <div className="worker-name">
                    {check.worker.name}
                  </div>
                </div>

                <div className="date-section">
                  <div className="label">
                    TANGGAL JUAL
                  </div>

                  <div className="date">
                    {formatDate(check.sale.saleDate)}
                  </div>
                </div>
              </div>

              {/* DETAIL */}
              <div className="details">
                <div className="detail-row">
                  <span>Keping</span>

                  <strong>
                    {formatNumber(
                      check.calculation.pieces,
                    )}
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Berat Total</span>

                  <strong>
                    {formatNumber(
                      check.calculation.weightKg,
                    )}{' '}
                    kg
                  </strong>
                </div>

                <div className="detail-row">
                  <span>Harga / Kg</span>

                  <strong>
                    {formatRupiah(
                      check.calculation.pricePerKg,
                    )}
                  </strong>
                </div>
              </div>

              {/* PERHITUNGAN */}
              <div className="calculation">
                <div className="calc-row">
                  <span>
                    Pendapatan Kotor
                  </span>

                  <strong>
                    {formatRupiah(
                      check.calculation.grossValue,
                    )}
                  </strong>
                </div>

                <div className="calc-row">
                  <span>
                    Pendapatan Setelah ÷ 2
                  </span>

                  <strong>
                    {formatRupiah(
                      check.calculation.workerShare,
                    )}
                  </strong>
                </div>

                <div className="calc-row">
                  <span>
                    Kasbon
                  </span>

                  <strong>
                    {formatRupiah(
                      check.calculation.kasbon,
                    )}
                  </strong>
                </div>
              </div>

              {/* HASIL AKHIR */}
              {isDebt ? (
                <div className="payment-section debt">
                  <div className="payment-label">
                    TEKOR / SISA KASBON
                  </div>

                  <div className="payment-amount">
                    -{formatRupiah(debtAmount)}
                  </div>
                </div>
              ) : (
                <div className="payment-section">
                  <div className="payment-label">
                    PENDAPATAN BERSIH
                  </div>

                  <div className="payment-amount">
                    {formatRupiah(
                      check.calculation.netAmount,
                    )}
                  </div>
                </div>
              )}

              {/* FOOTER */}
              <div className="check-footer">
                AgroLedger
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}