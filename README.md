# Phatica — AI-Powered Strategic Communication Skills.

**Tagline:** AI-Powered Strategic Communication Skills. — hero subheadline (Indonesia):
"Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan."
Tagline lama sudah dihapus dari seluruh aplikasi — header, hero, footer,
dan judul dokumen ("Phatica — AI-Powered Strategic Communication Skills.").

**Logo:** Monogram P Dialog — huruf P teal dari dua gelembung percakapan,
titik teal di atas, latar indigo gelap. File asli disalin byte-for-byte ke
`public/logo.webp` (dipakai juga sebagai favicon) — jangan digambar ulang.

**Tampilan:** cerah dan profesional, struktur ala WRTH — latar krem hangat
#FFFBF5, teks indigo gelap #191641, aksen teal #14B8A6, kartu putih dengan
bayangan lembut, headline besar, mobile-first. Landing: hero, 3 kolom
"Latih. Dinilai. Naik Level.", "Semua Latihanmu, di Satu Layar" (dari data
asli pengguna, honest empty state bila 0 sesi — tanpa testimoni/statistik
palsu), kartu 4 pilar 13/3/3/5 = 24 skenario, FAQ fakta produk, headline
penutup "WAKTUMU LEBIH BERHARGA DARIPADA TERUS GUGUP SAAT BICARA.", footer
indigo. Merah hanya untuk sinyal bahaya/error (hapus riwayat, akhiri sesi,
pola berbahaya, kelemahan berulang, pesan error); tombol "Lanjutkan sesi aktif",
bilah pemakaian Free, dan peringatan batas habis memakai teal/indigo.

Platform latihan komunikasi berbasis **Multi-Agent AI** (bukan video satu arah):
Roleplay Agent jadi sparring partner, Evaluation Agent menilai dengan rubrik
per skenario + bukti kutipan. **Login email + password** (NextAuth
Credentials, hash scrypt), sesi 30 hari, data tiap akun terpisah.
Tidak perlu setup OAuth / login pihak ketiga sama sekali.

- **4 pilar, 24 skenario:** Interpersonal (13), PR/Krisis (3), Marketing & Sales (3),
  Personal Branding (5) — Wawancara Kerja, Wawancara Beasiswa LPDP, Orang Tua
  Menuntut, Minta Maaf, PHK & Pesangon, Teguran Keras, Menolak Tawaran Gaji,
  Menolak Pinjaman, Feedback ke Bawahan, Berani Bicara di Rapat, Menolak Beban
  Kerja, Rekan Pasif-Agresif, Negosiasi Gaji; Hoax/Fitnah Viral, Review Bintang 1,
  Live TikTok/IG; Skeptical Buyer "di Shopee lebih murah", Pitch Investor 2 Menit,
  Closing WA/DM PHP; Elevator Pitch, Hater, Cancel Culture, Endorsement/Rate Card,
  Podcast Expert.
- **Memori antar-sesi:** gaya bicara, kekuatan, kelemahan berulang (dengan hitungan),
  rekap sesi terakhir — disuntikkan ke sesi berikutnya.
- **Adaptation Engine level 1–5** per pilar: naik saat jawabanmu kuat, turun saat
  kewalahan, alasan dicatat dan ditampilkan.
- **Evaluation Agent:** satu fungsi scoring TERPISAH per dimensi rubrik (bukan satu
  tebakan prompt), plus tool bukti/blind-spot/pola-berbahaya yang membaca memori,
  plus tool laporan 5 bagian (putusan 1 kalimat, skor per bagian + tepat 3 kutipan
  bukti, 1 blind spot, 1 kalimat alternatif, 1 latihan 2 menit + perbandingan
  dengan sesi lalu). Mode evaluator: Jujur Keras / Supportif / Seimbang /
  Detail Teknis. Jejak tool bisa diperiksa di laporan sesi.
- **Pilar IV Personal Branding:** Brand Profile di memori, Brand Audit (bio + 3
  postingan → 4 skor + bio baru), Content Coach (draf Threads/LinkedIn → skor
  Hook/Kejelasan/Kejujuran + 3 hook rewrite). **Tanpa** scheduler posting,
  auto-DM, atau analitik follower.
- **AI:** rule-based sebagai default (tanpa kunci LLM, sesi tetap jalan penuh);
  bila `OPENAI_API_KEY` dipasang, Roleplay Agent memakai OpenAI — penilaian
  tetap memakai fungsi scoring terpisah, tidak pernah ditebak dari prompt.

## Paket Langganan — harga SAMA dengan ruang Muse

| Paket | Bulanan | Tahunan |
|---|---|---|
| **Free** | Rp0 | Rp0 |
| **Pro** | Rp99.000/bulan | Rp79.200/bulan (Rp950.400/tahun, hemat 20%) |
| **Tim / Institusi** | mulai Rp1.500.000/bulan/tim (s.d. 10 anggota) | — |

- **Free:** 3 simulasi/bulan, 1 pilar saja (Interpersonal), evaluasi dasar.
- **Pro:** simulasi tanpa batas harian, semua 4 pilar, evaluasi lengkap + riwayat
  progres, Brand Audit dan Content Coach.
- **Tim/Institusi:** semua fitur Pro, dashboard admin, laporan progres anggota,
  skenario custom.
- **Trial Pro 14 hari gratis.**

Tombol **"Paket Langganan"** ada di header (mudah terlihat) dan di tab Paket
Langganan, dengan toggle **Bulanan/Tahunan**, penanda paket saat ini (pengguna
baru = Free), tombol Pilih/Upgrade, dan batas Free 3 simulasi/bulan yang
ditampilkan di Beranda. Paket tersimpan di database (model `Subscription`:
plan + status + trial end).

> **Pembayaran masih SIMULASI — tidak ada transaksi nyata.** Tombol Pilih/Upgrade
> dan trial hanya mengubah paket di database dan diberi label jelas "SIMULASI".
> Jangan klaim live. Pasang Midtrans untuk pembayaran nyata (belum diimplementasi
> di versi ini).

## Teknologi

Next.js 14 (App Router, TypeScript) + Tailwind CSS + Prisma 5 + PostgreSQL.
Auth: NextAuth v4 (Credentials provider, hash password scrypt, JWT, sesi 30 hari).
Database: gunakan Postgres hosted (Neon) lewat `DATABASE_URL`.

## 1) Login email + password (tidak perlu setup apa pun dari pihak ketiga)

Login memakai **email + password saja** — tidak ada OAuth, tidak ada
login pihak ketiga, tidak ada Client ID/Secret, tidak ada redirect URI.

Alurnya:
1. Buka landing page → isi form **Daftar dengan Email** (nama, email,
   password minimal 8 karakter) → akun dibuat dan otomatis jadi paket **Free**.
2. Masuk berikutnya lewat tab **Masuk** dengan email + password yang sama.
3. Password hanya disimpan sebagai **hash scrypt** (salt per pengguna) —
   tidak pernah sebagai teks biasa. Sesi berlaku 30 hari; tiap akun hanya
   bisa melihat data latihannya sendiri.

> **Reset password:** belum ada reset mandiri di versi ini, karena tidak ada
> layanan pengiriman email yang dipasang — dan tidak ada tombol reset palsu
> yang berpura-pura mengirim email. Pengguna yang lupa password saat ini
> belum bisa memulihkan akunnya sendiri. Jangan klaim ada fitur reset.

## 2) Jalankan lokal

```bash
npm install
cp .env.example .env.local
# Isi di .env.local: DATABASE_URL, NEXTAUTH_URL=http://localhost:3000,
# NEXTAUTH_SECRET (string acak panjang).
# OPENAI_API_KEY opsional — kosong = mesin rule-based.
npx prisma db push             # JANGAN pakai `prisma migrate deploy` — repo ini tidak punya folder prisma/migrations/, jadi perintah itu tidak membuat tabel apa pun
npm run dev                    # http://localhost:3000
```

Aplikasi **mulai kosong**: tidak ada akun demo dan tidak ada data contoh.
Seed TIDAK berjalan saat deploy. Daftar pertama kali dengan form
"Daftar dengan Email" — akun itu otomatis jadi paket **Free**.

## 3) Push ke GitHub

Repo ini adalah **root aplikasi Next.js** — `package.json` ada di root repo,
**bukan** di dalam folder `phatica/`. Jadi di Vercel, **Root Directory dibiarkan kosong**.

```bash
cd phatica
git init
git add .
git commit -m "Phatica.ai v1: Multi-Agent AI training (login email + password, 24 skenario, evaluator per-rubrik, Pilar IV Personal Branding, paket langganan)"
# Buat repo kosong di github.com (misal: phatica) — JANGAN centang README/.gitignore di GitHub
git remote add origin https://github.com/NAMA-USER/phatica.git
git branch -M main
git push -u origin main
```

> Jangan pernah commit `.env`, `.env.local`, atau kunci database.
> File-file itu sudah ada di `.gitignore`. Yang aman di-commit hanya `.env.example`.

## 4) Deploy di Vercel

1. Buka vercel.com → **Add New → Project** → **Import** repo `phatica` dari GitHub.
2. Framework: Next.js (terdeteksi otomatis). **Root Directory: kosong**.
   Build Command: `npx prisma db push && npm run build` — ini yang membuat tabel
   database otomatis saat deploy. Jangan biarkan di `npm run build` saja,
   tabel tidak akan dibuat dan login akan gagal dengan error 500.
3. Di **Settings → Environment Variables** (Production), isi:

- `DATABASE_URL` — connection string Postgres (Neon)
- `NEXTAUTH_URL` — URL Vercel kamu, mis. `https://phatica.vercel.app`
- `NEXTAUTH_SECRET` — string acak panjang (mis. `openssl rand -base64 32`)
- `OPENAI_API_KEY` — opsional; kosong = AI rule-based

Tidak ada kredensial lain yang dibutuhkan — login email + password tidak
memerlukan setup OAuth apa pun.

4. **Database (Neon via Vercel Marketplace):** di Vercel, buka **Storage → Create
   → Postgres (Neon)**. Pilih:
   - **Environments: Production only**
   - **Create database branch for deployment: off** (jangan dicentang)
   - **Custom Prefix: `DATABASE`** — wajib diisi. Prefix `DATABASE` + `URL`
     menghasilkan `DATABASE_URL`, nama persis yang dibaca aplikasi ini. Kalau
     prefix dikosongkan, tombol Connect tidak bisa diklik.
   - Lalu **Connect** ke project `phatica` (Production).

   > ⚠️ **PENTING — periksa `DATABASE_URL` sebelum Deploy.** Aplikasi ini hanya
   > membaca environment variable bernama persis `DATABASE_URL`. Vercel / Neon
   > kadang hanya membuat `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, atau
   > `POSTGRES_URL_NON_POOLING`. Bila `DATABASE_URL` tidak ada di Production,
   > tambahkan manual dengan nilai yang disalin dari URL **direct / non-pooling**
   > (`POSTGRES_URL_NON_POOLING` atau `DATABASE_URL_UNPOOLED`).
   > Untuk membuat tabel, pakai connection string **langsung (direct, tanpa
   > `-pooler`)**; connection string pooler bisa gagal saat membuat tabel.

5. **Deploy.** Tidak ada langkah OAuth tambahan — tidak ada redirect URI
   yang perlu didaftarkan di mana pun.
6. Uji: buka situs → isi form **Daftar dengan Email** (nama, email,
   password minimal 8 karakter) → masuk Beranda → Beranda menampilkan paket
   **Free** dan batas 3 simulasi/bulan →
   pilih skenario Wawancara Kerja → kirim jawaban → Akhiri & Evaluasi →
   laporan 5 bagian muncul → tab **Paket Langganan** → toggle Bulanan/Tahunan
   → coba Trial Pro 14 hari (SIMULASI). Keluar lewat tombol **Keluar**,
   lalu masuk lagi lewat tab **Masuk** dengan email + password yang sama.

## Struktur

```
prisma/schema.prisma      # User (email + passwordHash scrypt),
                          # LearnerProfile, LearnerMemory, PracticeSession,
                          # SessionMessage, AdaptationEvent, Evaluation,
                          # BrandProfile, BrandAudit, ContentReview, Subscription
src/lib/scenarios.ts      # Katalog 24 skenario (4 pilar) + rubrik per skenario
src/lib/ai.ts             # Roleplay Agent, Adaptation Engine, Evaluation Agent
                          # (satu fungsi scoring per dimensi rubrik), Brand Audit,
                          # Content Coach — rule-based + OpenAI opsional
src/lib/plans.ts          # Harga paket Free/Pro/Tim + trial 14 hari
src/lib/auth.ts           # NextAuth v4: Credentials (email + password), JWT 30 hari
src/lib/password.ts       # Hash scrypt + verifikasi password
src/lib/prisma.ts         # Prisma client
src/lib/ensure.ts         # Buat baris Subscription/Memory/BrandProfile (default Free)
src/app/page.tsx          # Landing + form Masuk/Daftar Email, Beranda, Pilih Skenario,
                          # Ruang Latihan, Hasil Evaluasi, Memori Saya,
                          # Personal Branding, Paket Langganan
src/app/api/auth/[...nextauth]  # NextAuth (Credentials)
src/app/api/auth/register # Daftar email + password (409 bila email sudah terdaftar)
src/app/api/auth/me       # {user:null} bila belum login
src/app/api/scenarios     # 24 skenario (401 bila belum login)
src/app/api/sessions      # Mulai sesi (cek batas Free + pilar paket) + daftar sesi
src/app/api/sessions/[id]/message  # Balasan persona + adaptasi level
src/app/api/sessions/[id]/end      # Evaluasi 6+ tool + update memori
src/app/api/dashboard     # Progres, batas bulan ini, memori, paket
src/app/api/memory        # Memori + Brand Profile
src/app/api/brand/*       # Profil brand, Brand Audit, Content Coach
src/app/api/subscription  # Paket + upgrade/trial (SIMULASI)
src/app/api/history       # Hapus semua riwayat & memori
```

## Yang belum / batasan jujur

- **Login email + password, tanpa layanan email pengirim.** Yang sudah
  dites: form daftar/masuk tampil, API tanpa login mengembalikan 401,
  dan NextAuth Credentials terpasang. Yang harus kamu tes setelah deploy:
  daftar dengan email → masuk Beranda. **Reset password belum ada** —
  tidak ada tombol reset, karena tidak ada layanan email. Pengguna yang
  lupa password belum bisa memulihkan akunnya sendiri.
- **Pembayaran SIMULASI saja.** Upgrade/trial hanya mengubah paket di database.
  Tidak ada Midtrans live, tidak ada tagihan nyata.
- **Tanpa scheduler posting, auto-DM, atau analitik follower** — sesuai desain
  Pilar IV (coaching saja).
- AI tanpa `OPENAI_API_KEY` memakai mesin rule-based — sesi dan evaluasi tetap
  jalan penuh, skor dihitung dari metrik transkrip, tidak mengarang angka.
