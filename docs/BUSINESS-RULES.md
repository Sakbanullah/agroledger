


AgroLedger Business Rules
Status: Authoritative business specification

Dokumen ini mendefinisikan aturan bisnis inti AgroLedger. Dokumen ini bukan dokumentasi implementasi teknis. Jika implementasi saat ini berbeda dengan aturan di sini, kode harus disesuaikan melalui perubahan yang disengaja, bukan dengan mengubah arti aturan bisnis secara diam-diam.

1. Tujuan AgroLedger
AgroLedger adalah sistem untuk mencatat dan memahami aliran uang dari aktivitas usaha pertanian, terutama Sawit dan Karet.

Tujuan utama sistem adalah membuat pengguna dapat mengetahui:

dari kebun mana suatu hasil berasal;

komoditas apa yang dijual;

berapa berat hasil yang dijual;

berapa harga jual;

berapa nilai bruto penjualan;

siapa pemilik kebun;

berapa uang yang benar-benar menjadi hak pengguna;

berapa uang yang masih menjadi hak pemilik kebun lain;

berapa komisi yang diperoleh pengguna;

berapa uang yang benar-benar masuk dan keluar dari kas;

bagaimana transaksi tersebut memengaruhi kondisi keuangan secara keseluruhan.

Prinsip utama:

Uang yang masuk ke tangan pengguna tidak selalu sama dengan pendapatan pengguna.

Hal ini terutama berlaku untuk penjualan hasil kebun milik saudara.

2. Prinsip Bisnis Inti
2.1 Gross Sale bukan selalu Own Income
Nilai penjualan bruto (Gross Sale) adalah nilai yang dibayar pembeli atas hasil pertanian.

Nilai tersebut tidak otomatis menjadi pendapatan pengguna.

Contoh:

Berat: 2.000 kg

Harga: Rp3.000/kg

Gross Sale: Rp6.000.000

Jika hasil tersebut berasal dari kebun saudara, maka Rp6.000.000 bukan otomatis pendapatan pengguna.

Setelah komisi ditentukan:

Gross Sale: Rp6.000.000

Komisi pengguna: Rp400.000

Hak saudara: Rp5.600.000

Maka:

Gross Sale = Rp6.000.000

Own Income = Rp400.000

Owner Share = Rp5.600.000

2.2 Uang dapat berada di tangan pengguna tanpa menjadi milik pengguna
Untuk kebun milik saudara, pembeli dapat membayar kepada pengguna terlebih dahulu.

Uang tersebut secara ekonomi terdiri dari dua bagian:

bagian yang menjadi hak pemilik kebun;

bagian yang menjadi hak pengguna sebagai komisi.

Karena itu sistem harus dapat membedakan:

Cash Received

Owner Share

Commission

Own Income

2.3 Tidak boleh ada double counting
Satu transaksi penjualan tidak boleh menyebabkan pendapatan pengguna dihitung dua kali.

Contoh yang salah:

Gross Sale      +Rp6.000.000
Commission      +Rp400.000
---------------------------
Own Income      Rp6.400.000  ← SALAH
Yang benar:

Gross Sale       Rp6.000.000
Owner Share     -Rp5.600.000
----------------------------
Own Income       Rp400.000
Gross Sale adalah nilai transaksi penjualan, sedangkan Own Income adalah bagian ekonomi yang benar-benar menjadi hak pengguna.

3. Farm
3.1 Farm adalah sumber asal hasil
Setiap penjualan harus dapat dikaitkan dengan Farm.

Farm menentukan konteks kepemilikan dan membantu menentukan aturan bisnis yang berlaku.

3.2 Jenis kepemilikan Farm
AgroLedger menggunakan dua kategori kepemilikan:

OWN
OWN berarti kebun milik sendiri.

Untuk kebun OWN, hasil penjualan merupakan hak pengguna.

RELATIVE
RELATIVE berarti kebun milik saudara.

Untuk kebun RELATIVE, hasil penjualan bukan otomatis menjadi pendapatan pengguna. Pengguna memperoleh bagian melalui komisi yang disepakati dengan pemilik kebun.

3.3 Informasi hubungan keluarga
AgroLedger tidak perlu memodelkan detail hubungan keluarga seperti:

kakak;

adik;

paman;

sepupu;

dan sebagainya.

Untuk aturan komisi, yang diperlukan hanya:

OWN
RELATIVE
Nama pemilik kebun dapat disimpan melalui informasi owner/person yang sudah tersedia.

4. Commodity
AgroLedger saat ini menangani dua komoditas utama:

Sawit

Karet

Aturan bisnis komisi Sawit dan workflow Karet harus dipisahkan.

5. Aturan Sawit
5.1 OWN + Sawit
Jika:

Ownership = OWN
Commodity = Sawit
maka:

commission = Rp0;

owner share kepada saudara = Rp0;

seluruh gross sale merupakan hak pengguna;

seluruh gross sale dapat dianggap sebagai own income.

Contoh:

Weight      = 2.000 kg
Price       = Rp3.000/kg
Gross Sale  = Rp6.000.000

Commission  = Rp0
Owner Share = Rp0
Own Income  = Rp6.000.000
6. Aturan Sawit RELATIVE
6.1 Penjualan
Jika:

Ownership = RELATIVE
Commodity = Sawit
maka pembeli dapat membayar gross sale kepada pengguna terlebih dahulu.

Contoh:

Weight      = 2.000 kg
Price       = Rp3.000/kg
Gross Sale  = Rp6.000.000
Rp6.000.000 tersebut merupakan uang hasil penjualan kebun saudara yang sementara berada dalam penguasaan pengguna.

6.2 Komisi ditentukan setelah uang diterima
Komisi tidak harus ditentukan pada saat harga jual pertama kali dimasukkan.

Urutan bisnisnya adalah:

hasil kebun dijual;

pembeli membayar;

uang diterima pengguna;

pengguna berdiskusi dengan pemilik kebun;

jumlah/rate komisi disepakati;

komisi dicatat;

bagian pemilik kebun dihitung;

bagian pemilik kebun dapat dibayarkan melalui settlement.

Ini adalah aturan penting.

Jangan menganggap komisi sudah pasti sebelum kesepakatan dengan pemilik kebun terjadi.

7. Commission
7.1 Default commission
Default commission untuk Sawit RELATIVE adalah:

Rp200/kg

Default ini merupakan nilai awal/saran sistem.

Default tidak berarti setiap transaksi harus menggunakan Rp200/kg.

7.2 Commission override
Setiap transaksi RELATIVE + Sawit dapat menggunakan nilai commission yang berbeda dari default berdasarkan kesepakatan dengan pemilik kebun.

Contoh:

Default:

Rp200/kg
Transaksi tertentu disepakati:

Rp150/kg
Maka transaksi tersebut menggunakan:

Applied Commission Rate = Rp150/kg
Perubahan tersebut hanya berlaku untuk transaksi tersebut.

Default sistem tetap Rp200/kg.

7.3 Commission harus disimpan sebagai snapshot transaksi
Ketika komisi transaksi sudah disepakati/final, nilai yang digunakan transaksi harus disimpan.

Minimal informasi yang perlu dapat dipertahankan:

applied commission rate;

commission amount;

transaksi yang menggunakan nilai tersebut.

Tujuannya agar histori tidak berubah ketika default commission berubah di masa depan.

7.4 Perubahan default tidak mengubah histori
Misalnya:

Januari
Default:

Rp200/kg
Transaksi A:

2.000 kg × Rp200
= Rp400.000 commission
Februari
Default diubah menjadi:

Rp250/kg
Transaksi A tetap:

Rp400.000
Transaksi A tidak boleh dihitung ulang menjadi:

Rp500.000
7.5 Commission = 0
Commission dapat bernilai Rp0 jika memang disepakati demikian.

Jika transaksi RELATIVE + Sawit menggunakan commission Rp0:

Gross Sale       Rp6.000.000
Commission               Rp0
Owner Share       Rp6.000.000
Own Income                Rp0
Karena pengguna tidak memperoleh komisi dari transaksi tersebut.

8. Owner Share
8.1 Definisi
Owner Share adalah bagian gross sale yang menjadi hak pemilik kebun RELATIVE setelah commission pengguna diperhitungkan.

Rumus:

Owner Share = Gross Sale - Commission
8.2 Contoh
Gross Sale = Rp6.000.000
Commission = Rp400.000

Owner Share = Rp6.000.000 - Rp400.000
            = Rp5.600.000
8.3 Validasi
Sistem tidak boleh menghasilkan:

Commission > Gross Sale
karena akan menghasilkan owner share negatif.

Secara bisnis:

Commission >= 0
Owner Share >= 0
Commission <= Gross Sale
9. Karet
9.1 Tidak ada commission
Commission tidak berlaku untuk Karet.

Tidak peduli ownership-nya:

OWN + Karet
RELATIVE + Karet
keduanya:

Commission = Rp0
9.2 Workflow Karet tidak boleh terkena aturan Sawit
Workflow Karet yang sudah ada tetap menangani hal-hal seperti:

pekerja;

berat hasil;

pembagian;

kasbon;

settlement pekerja;

potongan yang memang merupakan aturan Karet.

Aturan commission Sawit tidak boleh dimasukkan ke workflow tersebut.

10. Settlement Pemilik RELATIVE
Untuk transaksi RELATIVE + Sawit, Owner Share merupakan hak pemilik kebun.

Selama belum dibayarkan:

Owner Share = kewajiban kepada pemilik
Setelah dibayarkan:

Owner Share = sudah diselesaikan
Pembayaran owner share tidak boleh mengubah:

gross sale;

berat penjualan;

harga jual;

applied commission rate;

commission amount.

Settlement hanya menyelesaikan kewajiban kepada pemilik.

11. Sale Lifecycle
Secara bisnis, transaksi RELATIVE + Sawit memiliki beberapa kejadian penting:

Sale Created
    ↓
Sale Confirmed
    ↓
Cash Received
    ↓
Commission Agreed
    ↓
Owner Share Determined
    ↓
Owner Settlement
    ↓
Transaction Completed
Implementasi status teknis saat ini dapat berbeda, tetapi sistem harus mampu merepresentasikan kejadian bisnis tersebut tanpa menghilangkan informasi penting.

12. Historical Integrity
Setelah transaksi diselesaikan/final:

Nilai berikut tidak boleh berubah karena perubahan konfigurasi global:

gross sale;

weight;

selling price;

ownership classification yang digunakan transaksi;

applied commission rate;

commission amount;

owner share.

Jika terjadi koreksi, koreksi harus dilakukan sebagai perubahan transaksi yang dapat diaudit, bukan dengan diam-diam menghitung ulang histori menggunakan konfigurasi terbaru.

13. Dashboard
Dashboard harus dapat membedakan minimal:

Sales
Gross Sales

Total Weight

Ownership
Own Farm Sales

Relative Farm Sales

Income
Own Income

Commission Income

Obligation
Owner Share Outstanding

Owner Share Paid

Cashflow
Cash Received

Cash Paid to Relative Owners

Net Cash Movement

14. Definisi Istilah
Gross Sale
Nilai penuh hasil penjualan kepada pembeli.

Weight × Price per Kg
Commission
Bagian yang menjadi hak pengguna dari penjualan kebun RELATIVE + Sawit berdasarkan kesepakatan dengan pemilik.

Owner Share
Bagian gross sale yang menjadi hak pemilik kebun RELATIVE setelah commission.

Own Income
Pendapatan yang benar-benar menjadi hak pengguna.

Cash Received
Uang yang benar-benar diterima pengguna dari pembeli.

Cash Paid
Uang yang benar-benar keluar dari kas pengguna.

Owner Settlement
Pembayaran bagian pemilik kebun RELATIVE.

15. Business Invariants
Aturan berikut harus selalu benar:

Sawit OWN
Commission = 0
Owner Share = 0
Own Income = Gross Sale
Sawit RELATIVE
Commission >= 0
Commission <= Gross Sale
Owner Share = Gross Sale - Commission
Own Income = Commission
Karet
Commission = 0
Semua transaksi
Gross Sale >= 0
Weight > 0 untuk transaksi penjualan valid
Price >= 0
Commission >= 0
Owner Share >= 0
16. Prinsip Implementasi
Business rule ini harus tetap berlaku walaupun:

UI berubah;

frontend diganti;

backend direfactor;

database diubah;

agent AI diganti;

laporan/dashboard didesain ulang.

Jangan memindahkan business rule ke frontend saja.

Backend/domain/application layer harus tetap menjadi sumber validasi bisnis.

17. Hal yang Tidak Boleh Dilakukan
Jangan:

menganggap seluruh gross sale RELATIVE sebagai own income;

menghitung commission sebagai pemasukan tambahan di atas gross sale;

menghitung ulang transaksi lama menggunakan default commission terbaru;

menerapkan commission ke Karet;

memasukkan commission ke settlement pekerja Karet;

memasukkan commission sebagai potongan harga pembeli;

mengubah commission transaksi lama hanya karena default berubah;

menggunakan hubungan keluarga detail sebagai syarat commission;

membuat dashboard hanya menjumlahkan seluruh IN sebagai income tanpa memperhatikan konteks transaksi;

membuat satu transaksi menghasilkan pendapatan ganda.

18. Source of Truth
Untuk aturan bisnis AgroLedger:

docs/BUSINESS-RULES.md
adalah sumber kebenaran untuk apa yang harus dilakukan sistem.

Jika implementasi teknis bertentangan dengan dokumen ini, jangan mengubah business rule secara diam-diam. Tandai konflik tersebut dan minta keputusan sebelum mengubah perilaku bisnis.