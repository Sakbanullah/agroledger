AgroLedger Phase Roadmap
Cara Pakai
Dokumen ini menjadi roadmap utama implementasi AgroLedger.
Untuk melanjutkan pekerjaan, gunakan prompt sederhana:
Lanjutkan Phase 3.

Agent wajib membaca phase terkait, audit kondisi aktual, lalu implementasi hanya sesuai scope phase tersebut.
Workflow setiap phase
1. Audit kondisi aktual.
2. Tentukan gap dan scope.
3. Implementasi.
4. Verification.
5. Report.
6. Close phase.
7. Baru lanjut ke phase berikutnya.
Jangan melakukan blind refactor atau melompat phase.
Phase 0 — Architecture & Business Rules Audit
Status: COMPLETE
Fokus:
- Audit architecture.
- Audit business rules.
- Audit cashflow.
- Clean Architecture direction.
- Ownership, commission, settlement, dan cashflow rules.
Dokumen utama:
- AGENTS.md
- docs/clean-architecture.md
- docs/BUSINESS-RULES.md
- docs/CASHFLOW-RULES.md
Phase 1 — Business Lifecycle Design
Status: COMPLETE
Fokus:
- Ownership lifecycle.
- Commission lifecycle.
- Owner settlement lifecycle.
- Sale lifecycle.
- Cashflow lifecycle.
- Historical compatibility.
Keputusan utama:
- Ownership: OWN / RELATIVE.
- Sawit RELATIVE default commission: Rp200/kg.
- Commission dapat di-override per transaksi, termasuk 0.
- Sawit OWN income = gross.
- Sawit RELATIVE income = commission.
- Owner share = gross - commission.
- Owner share menjadi payable sampai settlement selesai.
Phase 2A — Ownership, Commission & Settlement Schema
Status: COMPLETE
Fokus:
- Farm.ownershipType.
- Sale ownership snapshot.
- Commission fields.
- Owner share fields.
- MoneyTransaction.farmId.
- OwnerSettlement.
- Database migration.
Verification:
- Prisma validate.
- Prisma generate.
- TypeScript.
- Migration deploy.
- Real DB smoke test.
Phase 2B — Commission & Owner Settlement Lifecycle
Status: COMPLETE
Subphase:
- 2B-1 Commission.
- 2B-2 Owner settlement payment.
- 2B-3 Sawit completion.
Fokus:
- Commission endpoint.
- Owner settlement payment endpoint.
- Sawit completion flow.
Rules:
- Commission hanya Sawit RELATIVE.
- OWN commission = 0.
- Karet tidak memakai commission Sawit.
- Commission tidak dapat ditentukan dua kali.
- Overpayment ditolak.
- Owner payment menghasilkan MoneyTransaction OUT.
- Tidak membuat cash-in kedua untuk commission.
Known technical debt:
- Concurrent owner settlement payment race condition masih menjadi warning/non-blocking.
Phase 2C — Reporting & Dashboard
Status: COMPLETE
Fokus:
- Cash In vs Own Income.
- Gross Sales.
- Own Income.
- Commission Income.
- Owner Share Outstanding/Paid.
- Breakdown commodity.
- Breakdown ownership.
- Breakdown farm/multi-farm.
- Centralized API client.
Backend:
- backend/src/reports/reports.calculator.ts
- backend/src/reports/reports.service.ts
Frontend:
- lib/api.ts
- app/page.tsx
Verification:
- Reporting calculator: 33/33 tests passed.
- npx tsc --noEmit: passed.
- Phase 2C calculator lint issues fixed.
- Hardcoded dashboard API fetches replaced.
- Existing unrelated technical debt remains outside scope.
Phase 3 — Overview Refinement
Status: NEXT
Tujuan:
Menjadikan Overview sebagai cockpit utama AgroLedger.
Scope:
- Cash Position.
- Income Summary.
- Cash Flow.
- Harvest Overview.
- Recent Transactions.
- Latest Settlement.
Metrics:
- Cash In.
- Cash Out.
- Net Cash.
- Gross Sales.
- Own Income.
- Commission Income.
- Owner Share Outstanding.
- Owner Share Paid.
UI:
- Konsisten dengan desain existing.
- Perbaiki hierarchy, spacing, typography, card grouping.
- Loading, empty, dan error state bila diperlukan.
- Tampilkan breakdown ownership/farm bila sesuai dengan data yang tersedia.
Constraints:
- Jangan membuat formula accounting baru di frontend.
- Jangan mengubah transaction logic.
- Gunakan reporting API existing.
- Audit app/page.tsx sebelum coding.
Acceptance:
- Cash, income, dan obligation jelas terpisah.
- Tidak ada hardcoded API fetch.
- Tidak ada regression dashboard.
- TypeScript dan relevant tests/lint lolos.
Phase 4 — Transactions
Status: PLANNED
Tujuan:
Menjadikan Transactions sebagai pusat aktivitas transaksi.
Konsep:
- Sales.
- Money Transactions.
- Transaction Detail.
Audit wajib:
- Sale.
- MoneyTransaction.
- Cash flow.
- Status transaksi.
- Existing transaction pages.
Constraints:
- Jangan membuat source of truth kedua.
- Jangan menduplikasi business logic.
Acceptance:
- Struktur transaksi jelas.
- Sales dan cash movement tidak tercampur secara konsep.
Phase 5 — Harvest
Status: PLANNED
Tujuan:
Monitoring hasil panen.
Prinsip:
- Jangan otomatis membuat CRUD Harvest baru.
- Audit hubungan Harvest → Sale → Settlement.
- Tentukan source of truth terlebih dahulu.
- Jika cukup read-only, gunakan read-only UI.
Kemungkinan UI:
- Harvest List.
- Harvest Detail.
- Link ke Sale.
- Link ke Settlement.
Acceptance:
- Tidak menduplikasi data.
- Source of truth jelas.
- Tidak membuat input flow kedua tanpa requirement.
Phase 6 — Settlement
Status: PLANNED
Tujuan:
Menyatukan pengalaman settlement tanpa mencampurkan business rules.
Area:
- Sales Settlement.
- Owner Settlement.
- Worker Settlement.
Audit:
- Existing settlement flow.
- Owner settlement lifecycle.
- Worker settlement lifecycle.
- Status.
- Payment history.
Acceptance:
- Owner dan worker settlement jelas berbeda.
- Partial/full payment tetap benar.
- Cash movement tetap konsisten.
- Tidak mengubah business rules existing.
Phase 7 — Farms
Status: PLANNED
Tujuan:
Menjadikan Farm sebagai pusat konteks bisnis.
Farm Detail dapat mencakup:
- Overview.
- Harvest.
- Sales.
- Cash Flow.
- Owner.
- Performance.
Konteks:
- Sawit / Karet.
- OWN / RELATIVE.
- Multi-farm.
Acceptance:
- Performa satu farm dapat dilihat tanpa mencampur farm lain.
- Historical ownership tidak berubah hanya karena master data berubah.
Phase 8 — People
Status: PLANNED
Tujuan:
Menyederhanakan master data manusia.
Struktur UI:
- People.
- Owners.
- Workers.
Constraints:
- Jangan membuat family relationship model baru tanpa requirement.
- Pertahankan model database existing.
Acceptance:
- Owner dan worker mudah ditemukan.
- Relasi Farm/Settlement tetap benar.
Phase 9 — Kasbon
Status: PLANNED
Tujuan:
Merapikan lifecycle kasbon.
Area:
- Active Credits.
- History.
- Payment.
Audit:
- CreditAccount.
- CreditTransaction.
- Worker settlement.
- Saldo kasbon.
Acceptance:
- Outstanding jelas.
- History jelas.
- Flow settlement Karet tidak rusak.
Phase 10 — Reports
Status: PLANNED
Tujuan:
Reports menjadi analysis center, bukan dashboard kedua.
Area:
- Financial.
- Sales.
- Farms.
- Ownership.
- Settlement.
Filter:
- Date Range.
- Farm.
- Commodity.
- Ownership.
Data yang sudah tersedia:
- Cash In.
- Cash Out.
- Net Cash.
- Gross Sales.
- Own Income.
- Commission Income.
- Owner Share Outstanding.
- Owner Share Paid.
- Commodity breakdown.
- Ownership breakdown.
- Farm breakdown.
Constraints:
- Gunakan reporting backend existing.
- Jangan membuat calculator baru tanpa requirement.
- Jangan menduplikasi logic Overview.
Phase 11 — Settings & Business Rules UI
Status: PLANNED
Tujuan:
Expose konfigurasi yang memang diperlukan user.
Kemungkinan:
- General.
- Business Rules.
- Commission configuration.
Contoh:
- Default Sawit RELATIVE commission = Rp200/kg.
Constraints:
- Perubahan default tidak boleh mengubah historical transaction.
- Jangan membuat konfigurasi mutable tanpa audit business impact.
Phase 12 — Full Integration & Regression Testing
Status: PLANNED
Fokus:
- Build.
- TypeScript.
- Lint.
- Unit tests.
- Integration tests.
- Database integrity.
- Frontend regression.
- Business rule verification.
Skenario:
- Sawit OWN.
- Sawit RELATIVE.
- RELATIVE partial owner settlement.
- RELATIVE full owner settlement.
- Karet.
- Multi-farm.
- Cash In/Out/Net.
- Gross Sales vs Own Income.
- Owner Share Outstanding/Paid.
Acceptance:
- Tidak ada regression terhadap phase sebelumnya.
- Business rules konsisten.
- Project siap menuju deployment.
Global Rules
1. Backend auth bukan scope kecuali diminta eksplisit.
2. Audit first, implementation second.
3. Jangan blind refactor.
4. Jangan mengubah business rules tanpa keputusan eksplisit.
5. Jangan membuat duplicate source of truth.
6. Business formula penting tidak dihitung ulang di frontend.
7. Gunakan centralized API client.
8. Migration hanya jika schema memang berubah.
9. Pertahankan backward compatibility bila memungkinkan.
10. Setiap phase wajib memiliki verification.
11. Jangan commit/push kecuali diminta.
12. Bedakan error baru akibat phase aktif dengan technical debt lama.
13. Jangan memperbaiki pre-existing error di luar scope hanya karena muncul saat verification.
14. Setelah phase selesai, report hasil dan tunggu phase berikutnya.