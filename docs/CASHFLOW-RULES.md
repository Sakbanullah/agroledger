AgroLedger Cashflow Rules

Status: Authoritative cashflow specification

Dokumen ini mendefinisikan bagaimana uang bergerak, bagaimana uang diklasifikasikan, dan bagaimana AgroLedger membedakan cashflow dari income.

1. Prinsip Utama

AgroLedger harus membedakan tiga konsep:

Transaction Value

nilai ekonomi suatu penjualan.

Cash Movement

uang yang benar-benar masuk atau keluar dari kas pengguna.

Own Income

bagian yang benar-benar menjadi hak pengguna.

Ketiga konsep tersebut tidak boleh dianggap sama secara otomatis.

2. Gross Sale

Gross Sale adalah nilai penuh yang dibayar pembeli untuk hasil penjualan.

Rumus dasar:

Gross Sale = Weight × Price per Kg

Contoh:

Weight      = 2.000 kg
Price       = Rp3.000/kg

Gross Sale  = 2.000 × Rp3.000
            = Rp6.000.000

Gross Sale adalah nilai penjualan, bukan otomatis Own Income.

3. Cash Received

Cash Received adalah uang yang benar-benar diterima dari pembeli.

Contoh:

Gross Sale  = Rp6.000.000
Cash Received = Rp6.000.000

Untuk RELATIVE + Sawit, cash tersebut dapat sementara berada di kas pengguna walaupun sebagian bukan milik pengguna secara ekonomi.

4. OWN + SAWIT

4.1 Cashflow

Contoh:

Gross Sale      Rp6.000.000
Cash Received   Rp6.000.000
Commission      Rp0
Owner Share     Rp0
Own Income      Rp6.000.000

Cashflow:

Buyer
  │
  │ +Rp6.000.000
  ▼
User Cash

Seluruh uang tersebut merupakan hak pengguna.

5. RELATIVE + SAWIT

5.1 Cash Received

Contoh:

Gross Sale    = Rp6.000.000
Cash Received = Rp6.000.000

Uang masuk penuh dari pembeli.

Namun:

Own Income ≠ Rp6.000.000

karena sebagian uang merupakan hak pemilik kebun.

6. Commission

Default:

Rp200/kg

Namun commission aktual dapat berbeda berdasarkan kesepakatan dengan pemilik kebun.

Contoh:

Weight = 2.000 kg
Applied Rate = Rp200/kg

Commission = 2.000 × Rp200
           = Rp400.000

7. Owner Share

Rumus:

Owner Share = Gross Sale - Commission

Contoh:

Gross Sale = Rp6.000.000
Commission = Rp400.000

Owner Share = Rp5.600.000

Secara ekonomi:

Rp6.000.000
├── Rp5.600.000 → Owner
└── Rp400.000   → User

8. Cashflow RELATIVE + SAWIT

Urutan cashflow:

STEP 1
Buyer
  │
  │ +Rp6.000.000
  ▼
User Cash

STEP 2
AgroLedger mencatat:
Gross Sale = Rp6.000.000

STEP 3
Commission disepakati:
Rp400.000

STEP 4
Owner Share:
Rp5.600.000

STEP 5
User membayar owner:
  │
  │ -Rp5.600.000
  ▼
Relative Owner

HASIL AKHIR:
User Cash Net = Rp400.000
Own Income    = Rp400.000

9. Commission Bukan Cash In Kedua

Ini adalah aturan paling penting.

Jangan membuat:

Cash In:
+Rp6.000.000 gross sale

kemudian:

Cash In:
+Rp400.000 commission

jika keduanya berasal dari uang Rp6 juta yang sama.

Jika dilakukan demikian, cashflow akan salah.

Yang benar:

Cash In from Buyer:
+Rp6.000.000

Cash Out to Owner:
-Rp5.600.000

Net Cash retained:
+Rp400.000

Commission merupakan bagian dari gross sale yang menjadi hak pengguna.

10. Cashflow vs Income

Cashflow

Untuk RELATIVE + Sawit:

Cash In        +Rp6.000.000
Cash Out       -Rp5.600.000
Net Cash        Rp400.000

Income

Own Income = Rp400.000

Jadi:

Cash Received = Rp6.000.000
Own Income    = Rp400.000

Keduanya boleh berbeda.

11. Owner Share sebagai Liability / Payable

Sebelum owner dibayar:

Gross Sale        Rp6.000.000
Owner Share       Rp5.600.000
Commission          Rp400.000

Secara ekonomi:

User memiliki cash:
Rp6.000.000

Tetapi:
Rp5.600.000 masih menjadi hak owner.

Maka sistem perlu mampu menunjukkan:

Owner Payable / Owner Share Outstanding
= Rp5.600.000

12. Setelah Owner Dibayar

Ketika Rp5.600.000 dibayarkan:

Cash:
Rp6.000.000
-
Rp5.600.000
=
Rp400.000

Owner payable:

Rp5.600.000 → Rp0 outstanding

Commission:

Rp400.000

Tetap tidak berubah.

13. Owner Settlement Tidak Mengubah Sale

Pembayaran kepada owner tidak boleh mengubah:

Gross Sale;

Weight;

Price;

Commission Rate;

Commission Amount.

Settlement hanya mengubah status kewajiban pembayaran owner.

14. Karet

Karet tidak menggunakan commission.

Contoh:

Gross Sale = Rp5.000.000
Commission = Rp0

Cashflow Karet tetap mengikuti workflow Karet yang sudah ada, termasuk aturan pekerja, settlement, kasbon, dan deduction yang memang berlaku pada Karet.

Jangan menggunakan formula Sawit RELATIVE untuk Karet.

15. Dashboard Cashflow

Dashboard harus mampu memisahkan:

Cash In

cash received from sales;

sumber transaksi;

farm;

commodity.

Cash Out

owner settlement;

worker settlement;

kasbon/payment;

expense lain yang memang tercatat.

Income

own-farm sales income;

relative-farm commission income.

16. Jangan Menggunakan Total MoneyTransaction IN sebagai Total Income

Jika semua transaksi IN dijumlahkan tanpa klasifikasi, maka:

Relative Farm Gross Sale

dapat salah dianggap sebagai:

Own Income

Dashboard harus menggunakan konteks transaksi.

Minimal konteks yang perlu diketahui:

farm;

ownership;

commodity;

sale;

owner share;

commission;

transaction purpose/category.

17. Cashflow Example: OWN + SAWIT

Sale:
2.000 kg × Rp3.000
= Rp6.000.000

Cash In:
+Rp6.000.000

Owner Share:
Rp0

Commission:
Rp0

Own Income:
Rp6.000.000

Net Cash:
+Rp6.000.000

18. Cashflow Example: RELATIVE + SAWIT

Sale:
2.000 kg × Rp3.000
= Rp6.000.000

Cash In:
+Rp6.000.000

Commission:
Rp400.000

Owner Share:
Rp5.600.000

Owner Settlement:
-Rp5.600.000

Net Cash:
+Rp400.000

Own Income:
Rp400.000

19. Cashflow Example: RELATIVE + SAWIT dengan Override

Default:

Rp200/kg

Tetapi transaksi disepakati:

Rp150/kg

Maka:

Weight = 2.000 kg

Commission:
2.000 × Rp150
= Rp300.000

Owner Share:
Rp6.000.000 - Rp300.000
= Rp5.700.000

Cashflow:

Cash In:
+Rp6.000.000

Owner Settlement:
-Rp5.700.000

Net Cash:
+Rp300.000

Own Income:
Rp300.000

Default Rp200/kg tidak boleh memengaruhi transaksi tersebut.

20. Cashflow Example: Commission 0

Gross Sale = Rp6.000.000
Commission = Rp0
Owner Share = Rp6.000.000

Cashflow:

Cash In:
+Rp6.000.000

Owner Settlement:
-Rp6.000.000

Net Cash:
Rp0

Own Income:
Rp0

21. Partial Owner Settlement

Jika sistem mengizinkan pembayaran owner secara bertahap, maka:

Contoh:

Owner Share = Rp5.600.000

Dibayar pertama:

Rp3.000.000

Maka:

Owner Share Outstanding:
Rp2.600.000

Pembayaran kedua:

Rp2.600.000

Maka:

Outstanding:
Rp0

Gross Sale dan Commission tetap sama.

Jika partial settlement belum didukung oleh implementasi, aturan ini menjadi requirement yang harus diputuskan sebelum fitur tersebut dibuat, bukan alasan untuk mengubah arti Gross Sale atau Commission.

22. Transaction Integrity

Satu transaksi tidak boleh menciptakan dua sumber pendapatan untuk uang yang sama.

Contoh:

Gross Sale = Rp6.000.000
Commission = Rp400.000

Tidak boleh:

Income = Rp6.000.000 + Rp400.000

Yang benar:

Gross Sale = Rp6.000.000
Own Income = Rp400.000

23. Historical Cashflow Integrity

Transaksi lama harus mempertahankan:

gross sale;

applied commission rate;

commission amount;

owner share;

ownership context.

Perubahan default commission tidak boleh mengubah histori.

24. Accounting Formula Summary

OWN + Sawit

Gross Sale = Weight × Price

Commission = 0

Owner Share = 0

Own Income = Gross Sale

Net Cash from Sale = Gross Sale

RELATIVE + Sawit

Gross Sale = Weight × Price

Commission = Weight × Applied Commission Rate

Owner Share = Gross Sale - Commission

Own Income = Commission

Net Cash after Owner Settlement
= Gross Sale - Owner Share
= Commission

Karet

Commission = 0

Workflow cashflow mengikuti aturan Karet yang sudah ada.

25. Money Movement Classification

Setiap cash movement harus mempunyai tujuan yang jelas.

Contoh kategori konseptual:

SALE_RECEIPT
OWNER_SETTLEMENT
WORKER_SETTLEMENT
CREDIT_PAYMENT
EXPENSE
OTHER

Untuk transaksi sale RELATIVE:

SALE_RECEIPT
    ↓
Cash received from buyer

OWNER_SETTLEMENT
    ↓
Cash paid to relative owner

Commission tidak boleh menjadi SALE_RECEIPT kedua dari uang yang sama.

26. Farm-Level Cashflow

Karena AgroLedger dapat menangani lebih dari satu farm, laporan tidak boleh mengasumsikan hanya ada satu kebun.

Sistem harus dapat mengelompokkan transaksi berdasarkan:

farm;

ownership;

commodity;

sale;

period.

Contoh:

Farm A
OWN + Sawit
Gross Sales = Rp10.000.000
Own Income  = Rp10.000.000

Farm B
RELATIVE + Sawit
Gross Sales = Rp6.000.000
Commission  = Rp400.000
Owner Share = Rp5.600.000
Own Income  = Rp400.000

Dashboard global:

Gross Sales       Rp16.000.000
Own Income        Rp10.400.000
Owner Share        Rp5.600.000

Bukan:

Own Income = Rp16.000.000

27. Cashflow Reporting

Laporan harus memungkinkan pengguna menjawab:

"Berapa total penjualan?"

Gunakan:

Gross Sales

"Berapa pendapatan saya?"

Gunakan:

Own Income

"Berapa uang saudara yang masih saya pegang?"

Gunakan:

Owner Share Outstanding

"Berapa uang yang benar-benar masuk dari pembeli?"

Gunakan:

Cash Received

"Berapa uang yang sudah saya bayarkan ke pemilik?"

Gunakan:

Owner Settlement Paid

"Berapa uang bersih yang tersisa dari penjualan saudara?"

Gunakan:

Gross Sale - Owner Settlement

dengan mempertimbangkan settlement yang benar-benar telah dilakukan.

28. Important Distinction

Jangan menggunakan satu angka untuk menjawab semua pertanyaan.

AgroLedger harus membedakan:

SALES
    Gross Sale

INCOME
    Own Income

LIABILITY
    Owner Share Outstanding

CASHFLOW
    Cash In / Cash Out

SETTLEMENT
    Amount Paid to Owner

Satu transaksi dapat memiliki semua nilai tersebut secara bersamaan.

29. Business Invariants

Untuk RELATIVE + Sawit:

Gross Sale >= 0
Commission >= 0
Commission <= Gross Sale
Owner Share = Gross Sale - Commission
Own Income = Commission

Setelah full owner settlement:

Owner Share Outstanding = 0

Jika belum dibayar:

Owner Share Outstanding > 0

Untuk OWN + Sawit:

Commission = 0
Owner Share = 0
Own Income = Gross Sale

Untuk Karet:

Commission = 0

30. Anti-Double-Counting Rules

Dilarang:

mencatat gross sale sebagai income pengguna untuk RELATIVE;

mencatat commission sebagai income tambahan di atas gross sale;

menjumlahkan seluruh cash-in sebagai own income;

membuat owner settlement menjadi income;

membuat commission menjadi cash-in kedua jika berasal dari gross sale yang sama;

menghitung ulang historical commission dari default terbaru.

31. Implementation Guidance

Dokumen ini mendefinisikan cashflow behavior, bukan memaksa satu struktur database tertentu.

Implementasi dapat menggunakan:

Sale fields;

MoneyTransaction;

owner payable;

settlement records;

atau kombinasi beberapa entity,

selama hasil akhirnya mengikuti aturan dokumen ini dan tidak menghasilkan double counting.

Jika struktur database saat ini tidak mampu membedakan:

Cash Received
Own Income
Owner Share
Commission

maka struktur tersebut harus dievaluasi sebelum fitur cashflow baru dianggap selesai.

32. Source of Truth

Untuk cashflow AgroLedger:

docs/CASHFLOW-RULES.md

adalah sumber kebenaran untuk:

gross sale;

cash received;

owner share;

commission;

own income;

owner settlement;

net cash movement;

dashboard cashflow;

anti-double-counting behavior.

Jika implementasi bertentangan dengan dokumen ini, konflik harus diselesaikan secara eksplisit sebelum perubahan bisnis dilakukan.