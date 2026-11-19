# Phatica — AI-Powered Strategic Communication Skills.

**Tagline:** AI-Powered Strategic Communication Skills. — hero subheadline (Indonesia):
"Komunikasi Strategis, Dilatih dengan Kecerdasan Buatan."
Tagline lama sudah dihapus dari seluruh aplikasi — header, hero, footer,
dan judul dokumen ("Phatica — AI-Powered Strategic Communication Skills.").

**Logo:** Monogram P Dialog — huruf P teal dari dua gelembung percakapan,
titik teal di atas, latar indigo gelap. File asli disalin byte-for-byte ke
`public/logo.webp` (dipakai juga sebagai favicon) — jangan digambar ulang.

**Tampilan (restyle November 2026 — STANDALONE SAJA, Muse space TIDAK diubah):**
sidebar gelap (slate #0F172A) dengan 7 nav item + nav pemilik bila OWNER_EMAIL cocok,
latar #F8FAFC, aksen gradien indigo #6366F1 → violet #8B5CF6, kartu putih radius 14px,
font Inter (Google Fonts), mode gelap (toggle di Beranda/sidebar, tersimpan di
localStorage "phatica-theme", default ikut sistem, skrip bootstrap anti-kedip di
layout.tsx), latar ikon komunikasi yang bergeser pelan + ticker tips dari tip
skenario asli, seluruh UI berbahasa Indonesia (tagline Inggris "AI-Powered
Strategic Communication Skills." dipertahankan sesuai pilihan pemilik — satu-satunya
teks Inggris di UI). Logo teal Monogram P tetap sebagai brand mark
(`public/logo.webp`), bukan warna aksen. Semua angka di layar berasal dari data
nyata akun yang login — tidak ada skor/streak/riwayat contoh; kosong = empty state
yang jujur. Desain lama krem hangat #FFFBF5/teal sudah tidak ada lagi.

Platform latihan komunikasi berbasis **Multi-Agent AI** (bukan video satu arah):
Roleplay Agent jadi sparring partner, Evaluation Agent menilai dengan rubrik
per skenario + bukti kutipan. **Login email + password** (sistem sesi custom, hash scrypt), sesi 30 hari, data tiap akun terpisah.
Tidak perlu setup OAuth / login pihak ketiga sama sekali.

- **5 pilar, 29 skenario:** Interpersonal (13), PR/Krisis (3), Marketing & Sales (3),
  Personal Branding (5), Public Speaking (5) — Wawancara Kerja, Wawancara Beasiswa LPDP, Orang Tua
  Menuntut, Minta Maaf, PHK & Pesangon, Teguran Keras, Menolak Tawaran Gaji,
  Menolak Pinjaman, Feedback ke Bawahan, Berani Bicara di Rapat, Menolak Beban
  Kerja, Rekan Pasif-Agresif, Negosiasi Gaji; Hoax/Fitnah Viral, Review Bintang 1,
  Live TikTok/IG; Skeptical Buyer "di Shopee lebih murah", Pitch Investor 2 Menit,
  Closing WA/DM PHP; Elevator Pitch, Hater, Cancel Culture, Endorsement/Rate Card,
  Podcast Expert; Pidato Pembukaan Acara, Presentasi Proyek di Depan Atasan,
  MC / Pembawa Acara Formal, Kuliah Umum / Ceramah di Depan Audiens Besar,
  Debat / Menyampaikan Pendapat di Forum.
- **Roleplay Bebas:** buat skenariomu sendiri — persona + sifat + situasi +
  tujuan → kartu persona + rubrik dinamis, 5 template sekali ketuk, tahap
  Pembuka/Digali/Keberatan & Penutup, maks 12 giliran, evaluasi 5 bagian
  yang sama. Lihat bagian "Roleplay Bebas" di bawah.
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
- **Pilar V Public Speaking:** 5 skenario — Pidato Pembukaan Acara, Presentasi
  Proyek di Depan Atasan, MC / Pembawa Acara Formal, Kuliah Umum / Ceramah di
  Depan Audiens Besar, Debat / Menyampaikan Pendapat di Forum. Rubrik memakai
  dimensi yang sudah dikenal evaluator (Struktur, Bukti, Pembuka, Hook, Nada,
  Ketegasan, Ketenangan, Bertahan, Usulan, Relevansi). Pilar Pro seperti
  pilar non-Free lainnya; Free tetap hanya Interpersonal. Tip 2 skenario
  (pidato pembukaan, kuliah umum) mengarahkan latihan suara lewat tombol 🎤.
- **AI:** rule-based sebagai default (tanpa kunci LLM, sesi tetap jalan penuh);
  bila kunci LLM dipasang, Roleplay Agent memakai LLM — OpenAI (default) atau
  Gemini (lihat bagian "Penyedia LLM: OpenAI & Gemini" di bawah) — penilaian
  tetap memakai fungsi scoring terpisah, tidak pernah ditebak dari prompt.

## Pilar V — Public Speaking

Pilar bawaan ke-5, 5 skenario baru di `src/lib/scenarios.ts` (id
`public-speaking-*`), masing-masing dengan modelAnswer, tip 2 menit, 2 varian
kalimat pembuka (`src/lib/opening-variants.ts`), dan pemetaan sifat
(`traitForScenario` di `src/lib/custom-roleplay.ts`):

| Skenario | Persona | Sifat |
|---|---|---|
| Pidato Pembukaan Acara | Pak Hendra, ketua panitia yang menuntut | Menekan |
| Presentasi Proyek di Depan Atasan | Bu Sinta, atasan yang skeptis dan suka menguji angka | Skeptis |
| MC / Pembawa Acara Formal | Ibu Ratna, koordinator yang menjaga rundown | Menekan |
| Kuliah Umum / Ceramah di Depan Audiens Besar | Audiens di baris belakang yang mudah mengantuk | Dingin |
| Debat / Menyampaikan Pendapat di Forum | Kak Rudi, moderator debat yang tajam | Skeptis |

Adaptation Engine level 1–5 berlaku per pilar seperti pilar lain (level
disimpan per nama pilar). Jalur Belajar Tes Awal bisa merekomendasikan
skenario Public Speaking: kunci rubriknya (termasuk `hook` dan `nada`)
termasuk dalam pemetaan dimensi di `src/lib/diagnostic.ts`. "Sesuaikan &
Mainkan" / "Duplikasi & Sesuaikan" jalan untuk kelima skenario baru karena
memakai jalur yang sama dengan skenario bawaan lainnya. Brand Audit / Content Coach
tidak berubah.

## Penyedia LLM: OpenAI & Gemini

Roleplay Agent memakai LLM bila ada kunci yang dipasang — tanpa kunci, sesi
tetap jalan penuh dengan mesin rule-based. Abstraksi penyedia ada di
`src/lib/llm-provider.ts` (`getActiveProvider()`):

**Aturan pemilihan:**
1. `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` terisi → **Gemini**.
2. `LLM_PROVIDER=openai` (default) + `OPENAI_API_KEY` terisi → **OpenAI**.
3. Bila penyedia yang diminta kuncinya kosong, dipakai penyedia lain bila
   kuncinya ada; bila tidak ada kunci sama sekali → rule-based.
4. Engine yang tampil di UI selalu penyedia yang **benar-benar menjawab**:
   `"openai"`, `"gemini"`, atau `"rule-based (persona)"`.

**Cara mengaktifkan di Vercel** (Settings → Environment Variables, Production):
- OpenAI: isi `OPENAI_API_KEY` (buat di platform.openai.com). `LLM_PROVIDER`
  boleh kosong / `"openai"`.
- Gemini: isi `GEMINI_API_KEY` (buat di Google AI Studio: aistudio.google.com)
  dan set `LLM_PROVIDER="gemini"`. `GEMINI_MODEL` opsional, default
  `gemini-2.0-flash`. Cek kuota gratis di AI Studio — kuota gratis ada tapi
  tidak dijamin.

**Yang sama untuk kedua penyedia:** prompt persona yang sama persis (jadi
perilaku persona identik), suhu dan batas token yang sama, dan **satu batas
harian yang sama: 30 giliran LLM per pengguna per hari (WIB)** — dihitung
hanya bila panggilan LLM berhasil, apa pun penyedianya (`src/lib/llm-usage.ts`).
Panggilan Gemini: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
dengan kunci sebagai query parameter; respons non-OK atau candidates kosong →
fallback ke rule-based dan error dicatat di log server (tanpa kunci).

**Batas yang jujur:** TIDAK ada kunci LLM yang terpasang di server saat ini
— OpenAI maupun Gemini sama-sama belum diisi di Vercel, jadi situs live
masih memakai rule-based sampai pemilik menambahkan kuncinya. Panggilan
Gemini baru diverifikasi lewat unit test dengan respons tiruan, BELUM
terhadap API Google yang sebenarnya.

## Roleplay Bebas — Skenario Buatanmu (tab baru)

Tab **Roleplay Bebas** di Beranda, di samping Pilih Skenario. Untuk situasi
yang tidak ada di 29 skenario tetap: kamu yang menentukan lawan bicara,
situasi, dan tujuanmu.

**Cara pakai:**
1. Isi form: **Bicara dengan siapa** (nama/panggilan + peran/hubungan +
   sifat: Skeptis / Marah / Ragu-ragu / Dingin / Menekan), **Situasinya**
   (2–3 kalimat, minimal 20 karakter), **Tujuanmu** (apa yang mau dicapai
   di akhir percakapan, wajib), level tekanan 1–5 (default 3), durasi
   sekitar 7–10 menit.
2. **Mode satu kalimat:** tulis situasimu dengan bahasamu sendiri di kotak
   atas, klik "Pakai kalimat ini sebagai situasi" — teksnya mengisi kolom
   Situasi (tanpa LLM).
3. **5 template sekali ketuk** yang mengisi seluruh form: Minta naik gaji,
   Menolak tanpa menyakiti, Komplain ke penjual, Minta maaf ke pasangan,
   Negosiasi harga dengan klien. Ubah seperlunya sebelum dibuat.
4. Klik **Buat Skenario & Lihat Kartu Persona** — server membangun **kartu
   persona** (nama, peran, sifat, apa yang dia mau, agenda tersembunyinya,
   gaya menekannya, kalimat pembuka yang dibuat dari kata-kata situasimu —
   bukan kalimat generik) dan **rubrik dinamis 3–4 dimensi dari tujuanmu**
   (mis. tujuan menyebut gaji/harga/angka → "Bukti & Angka"; menyebut
   maaf/perasaan/kecewa → "Empati & Validasi"; menyebut tolak/batas →
   "Ketegasan yang Sopan"; selalu ada "Kejelasan" + "Struktur"). Kamu
   **melihat kartu + rubrik dulu** sebelum menekan **Mulai Sesi**.
5. Sesi memakai ruang latihan yang sama. **Tahap** ditampilkan di ruangan:
   giliran 1–2 "Pembuka", 3–5 "Digali", 6+ "Keberatan & Penutup".
   **Maksimal 12 giliran pengguna** per sesi — setelah itu kamu diminta
   mengakhiri dan melihat evaluasi. Evaluasi memakai laporan 5 bagian yang
   sama (putusan 1 kalimat, skor per dimensi rubrik dinamis + tepat 3
   kutipan bukti, 1 blind spot, 1 kalimat alternatif, latihan 2 menit +
   perbandingan dengan sesi lalu), dan sesi custom ikut masuk memori dan
   Adaptation Engine seperti skenario tetap.
6. **Mesin yang menjawab ditampilkan jujur di ruangan:** "OpenAI
   (GPT-4o-mini)" bila `OPENAI_API_KEY` dipasang, "Gemini" bila
   `GEMINI_API_KEY` dipasang (dan `LLM_PROVIDER=gemini`), atau "Rule-based persona"
   bila tidak ada kunci. Tanpa kunci, persona menjawab dari **bank keberatan per
   sifat** (5+ balasan berbeda per sifat: Skeptis/Marah/Ragu-ragu/Dingin/
   Menekan, dipilih per tahap, memakai nama persona, kata situasi, dan
   pesan terakhirmu) — bukan 3 baris generik lama. Dengan kunci, persona
   menjawab lewat LLM dengan system prompt ketat dari kartu persona
   (nama, peran, sifat, tujuan persona, agenda tersembunyi, situasi,
   tujuanmu, tahap, level): tetap dalam karakter, tidak memberi nasihat,
   tidak keluar dari peran, tidak mudah setuju, Bahasa Indonesia
   sehari-hari, maks ~220 token.
7. Skenario buatanmu tersimpan per akun dan bisa dipakai ulang dari daftar
   "Skenario buatanmu sebelumnya". **Hapus Semua Riwayat & Memori** juga
   menghapus skenario buatanmu (cascade).

**Keamanan & privasi (batas jujur):** server menolak situasi < 20 karakter
atau tujuan kosong/pendek, dan memblokir kata romantis/seksual serta
pelecehan/ujaran kasar (daftar kecil di `src/lib/custom-roleplay.ts`,
BLOCKED_TERMS — penyaring kata, bukan penilai konteks). **Nama orang nyata
tidak bisa dideteksi secara andal oleh sistem ini** — karena itu UI
menampilkan peringatan "Gunakan peran umum (mis. 'atasan saya'), bukan
nama orang nyata yang bisa dikenali" dan catatan Laporkan; jangan memakai
nama lengkap orang nyata + institusi aslinya sebagai persona. Cerita yang
kamu tulis tersimpan di akunmu dan bisa dihapus lewat Hapus Semua Riwayat
& Memori.

**Tanpa kunci LLM pun jalan penuh** (mode rule-based persona); dengan
`OPENAI_API_KEY` atau `GEMINI_API_KEY`, persona jauh lebih hidup — penilaiannya tetap memakai
fungsi scoring terpisah, tidak pernah ditebak dari prompt.

## Menyesuaikan Skenario Tetap — "Duplikasi & Sesuaikan"

29 skenario tetap itu **statis dan tidak diubah** (id, judul, pilar tetap
sama, supaya memori dan level adaptasi tidak rusak). Tapi setiap kartu
skenario di tab Pilih Skenario punya tombol **Duplikasi & Sesuaikan**.

**Cara kerja:**
1. Klik "Duplikasi & Sesuaikan" di kartu mana pun — wizard Skenarioku
   (tab **Skenarioku**) terbuka **sudah terisi dari skenario itu**: nama
   persona, peran, konteks jadi situasi, tujuan, level = level dasar
   skenario, sifat persona dari pemetaan (`src/lib/custom-roleplay.ts`,
   `traitForScenario` — mis. HRD skeptis → Skeptis, atasan menegur →
   Menekan, pasangan kecewa → Marah, klien menawar → Menekan, pembeli
   ragu → Ragu-ragu, rekan pasif-agresif → Dingin), dan rubrik = rubrik
   skenario asli + 1 slot kosong untuk dimensi pilihanmu (bila rubrik
   asli sudah 4 dimensi, slot penuh dan itu dicatat di wizard).
2. Ubah field apa pun di 3 langkah wizard, cek kartu persona + rubrik di
   halaman review, lalu tekan **Simpan & Mainkan** atau **Simpan saja**.
   **Salinan baru dibuat di server HANYA saat kamu menekan Simpan** —
   duplikasi yang belum dikonfirmasi tidak dihitung ke batas 20 skenario.
   Salinan tersimpan sebagai `CustomScenario` (`sourceScenarioId` = id
   skenario asal) di Skenarioku, lengkap dengan kartu persona + rubriknya
   sendiri, dan bisa dimainkan ulang kapan saja dari tab Skenarioku.
   (Rute `POST /api/library/duplicate?id=` juga ada — ia membuat salinan
   yang sama langsung di server, untuk pemakaian API; UI wizard tidak
   memakainya sebelum pengguna menekan Simpan.)
3. Sesi dari salinan memakai aturan Roleplay Bebas: tahapan, bank
   keberatan per sifat, dan **batas 12 giliran pengguna**.
4. **Replay tidak identik (semua sesi tetap):** setiap skenario tetap
   punya 2 varian kalimat pembuka alternatif (`src/lib/opening-variants.ts`)
   — setiap sesi baru (disesuaikan maupun langsung "Mulai") memilih salah
   satu dari 3 kalimat (asli + 2 varian) secara acak, dan varian yang
   dipakai dicatat di `PracticeSession.openingVariant` (0 = asli).
5. **Sesi tetap yang TIDAK disesuaikan** (klik langsung "Mulai") tetap
   jalan seperti sekarang — tanpa batas 12 giliran — tapi juga memakai
   tahapan (Pembuka → Digali → Keberatan & Penutup), bank keberatan per
   sifat (kartu persona dibangun dari skenario + sifat petanya), dan varian
   pembuka. 3 kalimat generik lama tidak lagi dipakai di rute mana pun.
6. **Label yang membedakan:** kartu skenario tetap bertanda "Skenario
   asli"; di Beranda/riwayat, sesi dari salinan Skenarioku bertanda
   **"Skenarioku"**, sesi Roleplay Bebas lama yang disesuaikan dari skenario
   tetap bertanda **"Disesuaikan olehmu"**, sesi Roleplay Bebas murni
   "Roleplay Bebas", sesi tetap "Skenario asli".

**Contoh:** Wawancara Kerja — HRD Skeptis. Pengguna menekan "Sesuaikan &
Mainkan", mengganti situasi menjadi melamar posisi Digital Marketing di
startup, dan mengubah tujuan menjadi "menunjukkan saya bisa menaikkan
penjualan 20% dalam 3 bulan dengan bukti angka". Rubriknya tetap 4 dimensi
asli (Struktur, Bukti Konkret, Kepercayaan Diri, Nyambung dengan Posisi)
— karena "Bukti & Angka" dari tujuan baru sudah tercakup sebagai "Bukti
Konkret", tidak ada dimensi baru. Kalau tujuannya diubah menjadi "menolak
tawaran gaji di bawah standar tanpa menutup pintu", dimensi baru
"Ketegasan yang Sopan" akan menggantikan dimensi bobot terkecil.
Kalimat pembukanya bisa jadi varian "Saya lihat CV kamu. Bagus di atas
kertas. Sekarang buktikan ke saya: ceritakan satu hasil nyata yang kamu
capai, bukan tugas yang kamu kerjakan." — dan Bu Nadia menjawab dengan
bank keberatan Skeptis sesuai tahap, bukan 3 kalimat generik lama.

## Skenarioku + Pilarku — Perpustakaan Latihan Milik Pengguna (tab "Skenarioku")

Tab **Skenarioku** mengubah Phatica dari katalog tetap menjadi studio:
pengguna menyimpan skenario latihannya sendiri di bawah pilarnya sendiri.

**Yang ada di tab ini:**
- **Pilar Bawaan** — 5 pilar tetap (Interpersonal, PR/Krisis, Marketing &
  Sales, Personal Branding, Public Speaking), ditandai "bawaan", tidak bisa diubah/dihapus.
  Skenario buatanmu juga bisa disimpan di pilar bawaan.
- **Pilarku** — pilar buatan pengguna: nama (2–40 karakter), deskripsi
  opsional (maks 200), warna dari palet tetap 6 warna, ikon dari daftar
  tetap 8 ikon (tidak ada teks bebas). Buat/edit lewat form inline kecil.
  **Hapus pilar tidak menghapus skenarionya:** saat menghapus, pengguna
  memilih pilar bawaan tujuan — semua skenario di pilar itu dipindah ke
  sana, dan UI mengatakannya ("tidak ada skenario yang hilang").
- **Kartu skenario** di bawah tiap pilar: judul, persona, level, jumlah
  dimainkan (playCount), tombol **Mainkan**, **Edit**, **Duplikasi**,
  **Hapus**. Kosong = "Belum ada skenario buatanmu — mulai dari template,
  duplikasi skenario bawaan, atau buat dari nol." dengan ketiga jalan masuk
  itu sebagai tombol.

**Buat Skenario — wizard 3 langkah (bukan satu form raksasa):**
1. **"Siapa lawan bicaramu?"** — nama persona, peran, sifat (Skeptis /
   Marah / Ragu-ragu / Dingin / Menekan), level 1–5, pilih pilar.
2. **"Situasi & tujuanmu"** — judul (3–80 karakter), situasi (min 20
   karakter), tujuan (wajib), kalimat pembuka opsional dengan tombol
   "Buat kalimat pembuka otomatis dari situasiku" (template per sifat,
   sama seperti Roleplay Bebas).
3. **"Cara dinilai"** — pilih **2–4 dimensi rubrik** dari daftar (pustaka
   dimensi yang sama dengan evaluator — Bukti & Angka, Struktur, Empati,
   Ketegasan, Kejelasan, Mendengarkan Aktif, dst., masing-masing dengan
   contoh satu baris bahasa sehari-hari) **plus opsional 1 dimensi
   tulisan sendiri** (maks 40 karakter). Lalu halaman review: kartu
   persona + rubrik untuk disetujui, baru **Simpan & Mainkan** atau
   **Simpan saja**.
- **Keamanan & privasi:** penyaring kata + peringatan nama orang nyata
  yang sama seperti Roleplay Bebas, dan catatan "Hanya kamu yang bisa
  melihat skenario ini" — skenario bersifat privat per akun.

**Memainkan skenario Skenarioku:** memakai ruang latihan yang sama —
tahap Pembuka → Digali → Keberatan & Penutup, bank keberatan per sifat,
LLM persona ketat bila kunci LLM dipasang — OpenAI atau Gemini (kalau tidak, rule-based),
evaluasi 5 bagian yang sama **dengan rubrik skenario itu sendiri**.
Memulai sesi menaikkan `playCount` dan menautkan sesi ke skenario
(`PracticeSession.customScenarioId`); riwayat menandainya **"Skenarioku"**.

**Tiga jalan masuk lain:**
- **Duplikasi skenario bawaan** — tombol "Duplikasi & Sesuaikan" di kartu
  skenario tetap (lihat bagian di atas).
- **Duplikasi skenario sendiri** — tombol "Duplikasi" di kartu Skenarioku,
  membuka wizard dengan isi yang sama dan judul "Salinan dari …".
- **Simpan Roleplay Bebas** — setelah sesi Roleplay Bebas selesai dan
  evaluasi muncul, tombol **"Simpan sebagai skenario"** mengubahnya jadi
  skenario Skenarioku (judul disarankan otomatis dari situasi; bisa
  diganti judul/pilarnya di wizard). Sudah pernah disimpan = tidak dibuat
  duplikat, langsung ditunjukkan skenario yang sudah ada.

**Batas (konstanta bernama di `src/lib/custom-library.ts`, ditegakkan
server dengan pesan Indonesia yang jujur):** `MAX_CUSTOM_PILLARS = 5`
("Kamu sudah punya 5 pilar — hapus satu dulu sebelum membuat yang baru"),
`MAX_CUSTOM_SCENARIOS = 20` ("Kamu sudah punya 20 skenario — hapus satu
dulu sebelum membuat yang baru"). Membuat pilar/skenario/duplikasi/
simpan-dari-Roleplay-Bebas dibatasi rate limit yang sama seperti buat
Roleplay Bebas: 10 per pengguna per jam.

**Model data (Prisma):** `CustomPillar` (name unik per pengguna,
description, color, icon), `CustomScenario` (pillarKey = slug pilar
bawaan atau `custom:<pillarId>`, title, personaName, personaRole, trait,
situation, goal, level, openingLine, rubric JSON 2–4 dimensi,
sourceScenarioId, sourceCustomRoleplayId, playCount),
`PracticeSession.customScenarioId` (opsional; hapus skenario hanya
melepas tautan — riwayat sesi tetap tersimpan). Migrasi kedua:
`prisma/migrations/20261118054608_custom_library/migration.sql` (52 baris,
hanya tabel/fitur baru — migrasi awal tidak disentuh).

**Batas yang jujur:** skenario Skenarioku privat per akun (tidak bisa
dibagikan ke akun lain); tanpa kunci LLM (OpenAI/Gemini) sesi tetap jalan penuh
dengan mesin rule-based; **Jalur Belajar Tes Awal masih memakai 24
skenario bawaan** — skenario Skenarioku bisa dimainkan dan dilacak
(playCount + riwayat), tapi tidak dimasukkan otomatis ke jalur belajar.

## Umpan Balik Pengguna (rating + komentar)

Pengguna bisa memberi penilaian **1–5 bintang + komentar opsional (maks 1000
karakter)** — setelah sesi selesai (kartu "Beri penilaian untuk sesi ini" di
bawah laporan evaluasi, jenis `"sesi"`, satu penilaian per sesi) dan tentang
aplikasi secara umum (bagian "Umpan Balik untuk Phatica" di Pengaturan, jenis
`"aplikasi"`, plus daftar "Umpan balikmu" milik akun itu sendiri).

**Model:** `Feedback` (id, userId, rating 1–5, comment, kind `"sesi" | "aplikasi"`,
sessionId nullable, createdAt). Migrasi ketiga
`prisma/migrations/20261119020315_feedback/migration.sql` (hanya tabel baru —
migrasi lama tidak disentuh). Validasi + ringkasan di `src/lib/feedback.ts`
(rating 0/6 ditolak, komentar >1000 ditolak, `isOwnerEmail`, `summarizeFeedback`).

**API:** `POST /api/feedback` (wajib login, rate-limit 10/pengguna/jam,
satu penilaian per sesi — duplikat ditolak 409) dan `GET /api/feedback` —
**hanya pemilik**: bila email akun yang login sama dengan env var `OWNER_EMAIL`,
mengembalikan semua umpan balik (terbaru dulu, dengan nama/email pengguna +
judul sesi + rata-rata rating + jumlah per bintang); bila `OWNER_EMAIL` kosong
atau email tidak cocok → 403 "Hanya pemilik aplikasi yang bisa melihat umpan
balik pengguna." `GET /api/feedback?mine=1` mengembalikan umpan balik milik
pengguna itu sendiri. Status pemilik dibaca klien dari `/api/auth/me`
(`{ user, isOwner }`) — **nilai `OWNER_EMAIL` tidak pernah dikirim ke klien**.

**Cara pemilik melihat datanya:** isi `OWNER_EMAIL` di Vercel (Settings →
Environment Variables → Production, isi email akun pemilik), redeploy, lalu
masuk dengan akun itu — nav item **"Umpan Balik Pengguna"** (💬) muncul dan
menampilkan ringkasan (rata-rata, total, distribusi 1–5 bintang) + daftar
lengkap (nama, email, bintang, komentar, judul sesi, tanggal).

**Privasi:** komentar hanya terlihat oleh pemilik + pengirimnya sendiri, bukan
oleh pengguna lain (lihat halaman `/privasi`). **Batas yang jujur:** tanpa
`OWNER_EMAIL`, umpan balik tetap tersimpan di database tapi tidak bisa dilihat
dari UI mana pun. Tidak ada seed/contoh umpan balik — produksi mulai kosong.
"Hapus Semua Riwayat & Memori" juga menghapus umpan balik akun itu.

## Paket Langganan — DISEMBUNYIKAN SEMENTARA

Tombol langganan dan harga **saat ini disembunyikan dari tampilan** (fase
pertumbuhan: fokus kumpulkan pengguna dulu, tombol dipasang lagi nanti
setelah banyak user). Yang disembunyikan: tombol "Paket Langganan" di header,
tab Paket, kartu harga, toggle Bulanan/Tahunan, trial 14 hari, dan bilah/
peringatan kuota Free di Beranda. Pengguna tidak melihat nama paket, harga,
atau batas kuota apa pun.

**Backend langganan TETAP ADA dan utuh**, supaya mudah dipasang lagi:
model `Subscription` di Prisma, data harga di `src/lib/plans.ts`
(Free Rp0 — 3 simulasi/bulan, 1 pilar; Pro Rp99.000/bulan atau Rp79.200/bulan
tahunan Rp950.400/tahun; Tim/Institusi mulai Rp1.500.000/bulan/tim,
trial Pro 14 hari), route `/api/subscription`, dan pembuatan Subscription
saat daftar. Selama tombol disembunyikan, batas kuota Free dan batas pilar
paket **tidak ditegakkan**: flag `SUBSCRIPTIONS_ENABLED = false` di
`src/lib/plans.ts` membuat `POST /api/sessions` tidak menolak sesi apa pun
karena kuota/pilar — jadi tidak ada paywall tanpa jalan upgrade.

**Cara memasang lagi nanti:** (1) ubah `SUBSCRIPTIONS_ENABLED` di
`src/lib/plans.ts` menjadi `true`; (2) kembalikan tombol "Paket Langganan"
di header, tab Paket beserta kartu harga + toggle Bulanan/Tahunan, dan
bilah kuota Free di Beranda pada `src/app/page.tsx`.

> **Pembayaran masih SIMULASI — tidak ada transaksi nyata.** Bila tombol
> dipasang lagi, Pilih/Upgrade dan trial hanya mengubah paket di database
> dan diberi label jelas "SIMULASI". Jangan klaim live. Pasang Midtrans
> untuk pembayaran nyata (belum diimplementasi di versi ini).

## Teknologi

Next.js 14 (App Router, TypeScript) + Tailwind CSS + Prisma 5 + PostgreSQL.
Auth: sistem sesi custom (email + password, hash password scrypt, token sesi acak di database, cookie httpOnly, sesi 30 hari). Tanpa library auth eksternal.
Database: gunakan Postgres hosted (Neon) lewat `DATABASE_URL`.

## 1) Login email + password (tidak perlu setup apa pun dari pihak ketiga)

Login memakai **email + password saja** — tidak ada OAuth, tidak ada
login pihak ketiga, tidak ada Client ID/Secret, tidak ada redirect URI.

Alurnya:
1. Buka landing page → isi form **Daftar dengan Email** (nama, email,
   password minimal 8 karakter) → akun dibuat dan langsung bisa mulai latihan.
2. Masuk berikutnya lewat tab **Masuk** dengan email + password yang sama.
3. Password hanya disimpan sebagai **hash scrypt** (salt per pengguna) —
   tidak pernah sebagai teks biasa. Sesi berlaku 30 hari; tiap akun hanya
   bisa melihat data latihannya sendiri.

> **Reset password:** alur reset mandiri sudah ada — tautan "Lupa password?"
> di form masuk, halaman `/reset?token=...`, dan ganti password di tab
> Memori Saya. Reset lewat email HANYA jalan bila `RESEND_API_KEY` +
> `EMAIL_FROM` dipasang di Vercel (lihat bagian 4). Tanpa itu, UI menampilkan
> pesan jujur "Layanan email belum dipasang — hubungi pemilik aplikasi untuk
> reset manual" dan tidak ada token yang dibocorkan di respons API.

## 2) Jalankan lokal

```bash
npm install
cp .env.example .env.local
# Isi di .env.local: DATABASE_URL, SESSION_SECRET (string acak panjang).
# OPENAI_API_KEY / GEMINI_API_KEY opsional — kosong = mesin rule-based.
# LLM_PROVIDER="openai" (default) atau "gemini"; GEMINI_MODEL default gemini-2.0-flash.
# RESEND_API_KEY + EMAIL_FROM opsional — kosong = reset password lewat email
#   tidak jalan (UI jujur menampilkan itu); ganti password saat masuk tetap jalan.
npx prisma migrate deploy      # Buat tabel dari prisma/migrations/ (database BARU).
# Database LAMA yang dulu dibuat via `db push`: baseline dulu, sekali saja:
#   npx prisma migrate resolve --applied 20261117063029_init
#   (baru setelah itu `prisma migrate deploy` bisa dipakai di database itu)
# `migrate deploy` menerapkan KETIGA migrasi: 20261117063029_init (19 tabel),
# 20261118054608_custom_library (CustomPillar, CustomScenario,
# PracticeSession.customScenarioId — 52 baris, hanya fitur baru), dan
# 20261119020315_feedback (tabel Feedback — rating + komentar, hanya fitur baru).
npm run dev                    # http://localhost:3000
```

Aplikasi **mulai kosong**: tidak ada akun demo dan tidak ada data contoh.
Seed TIDAK berjalan saat deploy. Daftar pertama kali dengan form
"Daftar dengan Email" — akun itu langsung bisa mulai latihan.

## 3) Upload ke GitHub (lewat web, langsung bisa)

Repo ini adalah **root aplikasi Next.js** — `package.json` ada di root repo,
**bukan** di dalam folder `phatica/`. Jadi di Vercel, **Root Directory dibiarkan kosong**.

Tidak ada lagi nama file/folder dengan kurung siku `[ ]` di repo ini — folder rute auth catch-all dan folder rute sesi dinamis sudah dihapus dan diganti rute query-param
(`detail?id=`, `message?id=`, `end?id=`), jadi **upload web GitHub
(Add file → Upload files) langsung bisa**: download `phatica.zip`, extract,
lalu drag **isi** folder hasil extract ke repo GitHub dan klik **Commit changes**.
Tidak perlu GitHub Desktop dan tidak perlu terminal/git.

```bash
cd phatica
git init
git add .
git commit -m "Phatica.ai v1: Multi-Agent AI training (login email + password, 29 skenario, evaluator per-rubrik, Pilar IV Personal Branding, Pilar V Public Speaking)"
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
   Build Command: `prisma migrate deploy && npm run build` — ini yang membuat
   tabel database otomatis saat deploy. Jangan biarkan di `npm run build` saja,
   tabel tidak akan dibuat dan login akan gagal dengan error 500.
   Jangan pakai `--accept-data-loss` di perintah ini.

   > ⚠️ **DATABASE LIVE YANG SUDAH ADA (dibuat via `db push`) HARUS DI-BASELINE
   > SEKALI sebelum deploy pertama dengan Build Command baru.** Bila tidak,
   > `migrate deploy` akan gagal karena tabel sudah ada. Baseline TIDAK
   > mengubah data — ia hanya menandai migrasi awal sebagai sudah diterapkan:
   > jalankan sekali (di komputer yang bisa mencapai database, atau lewat
   > Vercel CLI / Neon SQL Editor tidak bisa — harus lewat Prisma CLI):
   > `DATABASE_URL="<connection string>" npx prisma migrate resolve --applied 20261117063029_init`
   > Lalu deploy seperti biasa dengan `prisma migrate deploy && npm run build`.
   > Deploy pertama setelah baseline menerapkan ketiga migrasi sekaligus
   > (init + `20261118054608_custom_library` untuk Skenarioku/Pilarku +
   > `20261119020315_feedback` untuk Umpan Balik).
   > Fallback bila baseline tidak mau dilakukan: tetap pakai Build Command
   > lama `npx prisma db push && npm run build` — tabel tetap dibuat/diperbarui
   > dari schema, migrasi hanya tidak tercatat.
3. Di **Settings → Environment Variables** (Production), isi:

- `DATABASE_URL` — connection string Postgres (Neon)
- `SESSION_SECRET` — string acak panjang (mis. `openssl rand -base64 32`)
- `OPENAI_API_KEY` — opsional; kosong = AI rule-based (bila GEMINI_API_KEY juga kosong)
- `LLM_PROVIDER` — opsional; "openai" (default) atau "gemini"
- `GEMINI_API_KEY` — opsional; kunci Gemini dari Google AI Studio (aistudio.google.com)
- `GEMINI_MODEL` — opsional; default gemini-2.0-flash
- `RESEND_API_KEY` — opsional; hanya untuk reset password lewat email (Resend)
- `EMAIL_FROM` — opsional; alamat pengirim email reset (harus terverifikasi di Resend)
- `NEXT_PUBLIC_SITE_URL` — opsional; dipakai sitemap/robots dan Open Graph (fallback: https://phatica.vercel.app)

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
   password minimal 8 karakter) → masuk Beranda →
   pilih skenario Wawancara Kerja → kirim jawaban → Akhiri & Evaluasi →
   laporan 5 bagian muncul. Keluar lewat tombol **Keluar**,
   lalu masuk lagi lewat tab **Masuk** dengan email + password yang sama.
   (Tombol langganan saat ini disembunyikan — lihat bagian Paket Langganan.)

## Tes Awal + Jalur Belajar (tab "Tes Awal" + kartu di Beranda)

- Tes singkat 3 situasi tertulis (perkenalan, menolak, menanggapi yang kecewa).
  Skor 4 dimensi dasar — Bukti, Struktur, Empati, Ketegasan — memakai fungsi
  `scoreDimension` yang sama dengan evaluator, jadi angka Tes Awal bisa
  dibandingkan dengan skor sesi. Bisa dilewati, bisa diulang (Tes Ulang).
- Jalur belajar: 2 dimensi terlemah → 3 skenario berurutan dari 29 katalog
  (dipilih dari rubriknya), masing-masing dengan tombol Mulai. Selesai 1
  skenario = 1 centang. Aturan "sudah bisa" yang jujur: skor ≥75 pada dimensi
  terlemah di 2 sesi. Model Prisma: `Diagnostic` (scores, weakest, path JSON).
  Rute: `GET/POST /api/diagnostic`.

## Suara (mikrofon + suara persona di Ruang Latihan)

### Input suara — transkripsi live & berkelanjutan

- Tombol 🎤 Bicara memakai Web Speech API (`SpeechRecognition`, bahasa id-ID,
  `interimResults` + `continuous` aktif, butuh Chrome + izin mikrofon).
- **Transkripsi tampil LIVE** di kotak jawaban saat pengguna berbicara
  (hasil interim langsung terlihat, bukan menunggu berhenti bicara), dan
  recognizer **menyambung otomatis** setiap kali browser menghentikannya
  di jeda bicara — kata-kata setelah jeda tidak hilang. Logika buffernya
  murni dan teruji di `src/lib/voice-transcript.ts`: teks yang sudah
  diketik menjadi *prefix* (suara menambah setelahnya, tidak pernah
  menimpa), hasil final terakumulasi lintas restart tanpa duplikasi,
  hasil interim hanya ditampilkan dan tidak pernah terkomit.
- Mikrofon berhenti untuk selamanya saat pengguna menekan tombol mic lagi,
  menekan Kirim, atau mengakhiri sesi. Error ditangani jujur: izin ditolak
  → pesan cara mengizinkan; koneksi pengenalan suara putus 3x berurutan →
  berhenti dengan pesan periksa internet.
- **Audio tidak pernah direkam/diunggah.** Yang dikirim hanya teks final +
  metrik sesi mikrofon secara keseluruhan (dari start pertama sampai
  berhenti final): durasi bicara (detik), jumlah kata, kecepatan
  (kata/menit), jumlah kata pengisi (eh, anu, eee, hmm, ya kan, ...).
  Laporan evaluasi menampilkan bagian Suara hanya bila ada jawaban suara,
  dengan label jujur bahwa kecepatan dan filler diukur dari transkripsi
  browser, bukan analisis audio.
- Metrik tersimpan di `PracticeSession.voiceMetrics` (JSON per giliran);
  ringkasan suara di `Evaluation.voiceSummary`.
- **Batas jujur input suara:** kualitas dan kecepatan pengenalan suara
  sepenuhnya tergantung browser + koneksi pengguna (di Chrome, pengenalan
  diproses lewat server Google). Pada momen yang jarang — misalnya
  pengguna berbicara persis saat recognizer sedang menyambung ulang —
  satu-dua kata masih bisa terlewat. Transkripsi streaming yang
  benar-benar tanpa celah memerlukan layanan ASR streaming berbayar
  (mis. Deepgram) + backend khusus — **belum termasuk**.

### Percakapan Suara — persona benar-benar berbicara (TTS)

- Toggle **🔊 Suara Persona: Nyala/Mati** di Ruang Latihan (di samping
  tombol mikrofon). Saat menyala, balasan persona **dibacakan otomatis**
  dengan `speechSynthesis` — termasuk kalimat pembuka saat sesi baru
  dimulai. Menyalakan mikrofon pertama kali otomatis menyalakan mode ini,
  kecuali pengguna pernah memilih sendiri; pilihan pengguna diingat di
  `localStorage` (`phatica-speak-persona`) dan juga bisa diatur dari
  Pengaturan & Profil.
- Suara yang dipakai dipilih dari `speechSynthesis.getVoices()`: utamakan
  lang persis `id-ID`, lalu lang berawalan `id` (helper murni
  `pickIndonesianVoice` di `src/lib/voice-transcript.ts`, menangani
  pemuatan async lewat event `voiceschanged`). Utterance selalu
  `lang="id-ID"`, rate 1.0, pitch 1.0. **Bila browser/sistem pengguna
  tidak punya suara Bahasa Indonesia**, dipakai suara default browser
  dengan lang tetap id-ID — kualitas dan aksennya tergantung browser &
  sistem pengguna, di luar kendali aplikasi.
- **Anti-tumpuk:** balasan baru selalu memotong bacaan sebelumnya
  (`cancel()` dulu); persona berhenti bicara saat sesi diakhiri, saat
  pengguna menekan mikrofon untuk bicara, dan saat pengguna pindah
  tab/view atau keluar. Selama persona berbicara tampil status kecil
  "🔊 Persona sedang bicara…" — menekan tombol Suara Persona
  menghentikannya. TTS murni lapisan tampilan: tidak mengubah logika
  sesi/evaluasi, dan audio tetap tidak direkam/diunggah.
- **Batas jujur TTS:** suara yang terdengar adalah suara bawaan browser —
  bukan suara neural sekelas manusia. Suara sekelas manusia memerlukan
  TTS cloud berbayar (OpenAI TTS / Google Cloud TTS / ElevenLabs) —
  **belum termasuk**.

## Latihan Lanjutan yang Ditagih (kartu "Latihan Hari Ini" di Beranda)

- Setiap evaluasi otomatis membuat `Drill` (jatuh tempo besok) berisi latihan
  2 menitnya. Beranda menampilkan drill yang menunggu + kolom jawaban dan
  tombol "Tandai Selesai"; yang selesai ditandai ✓. Laporan evaluasi menyebut
  status drill sebelumnya ("Latihan 2 menit kemarin: selesai/belum").
- Drill hanya ada di aplikasi — belum ada pengingat email (tidak ada layanan email).

## Contoh Jawaban + Pelajaran Singkat

- Setiap skenario di `scenarios.ts` kini punya `modelAnswer` (contoh jawaban
  kuat 1–2 kalimat) dan `tip` (pelajaran 2 menit). Tip tampil di kartu
  skenario dan di Ruang Latihan sebelum sesi; contoh jawaban tampil di sana
  dan di laporan evaluasi.
- Laporan evaluasi punya blok "Kalimatmu vs Versi yang Lebih Tajam":
  kalimat terlemah pengguna, versi tajamnya (klaim + contoh + angka +
  langkah berikutnya), dan 1 kalimat kenapa lebih tajam. Bagian yang harus
  diisi pengguna ditandai [ ... ] — tidak ada contoh/angka yang dikarang.

## Laporan Perkembangan (tab "Laporan")

- Tabel Tes Awal vs sekarang per dimensi, total sesi, tren 3 skor terakhir,
  kekuatan + kelemahan berulang dari memori, progres jalur belajar, ringkasan
  suara — semua dari data nyata pengguna. Tombol "Cetak / Simpan sebagai PDF"
  memakai `window.print` (tanpa dependensi PDF baru) dan "Salin Ringkasan".
  Kosong = "Belum ada data — selesaikan Tes Awal dan 1 sesi dulu".
  Rute: `GET /api/report`.

## Halaman Kepercayaan

- `/privasi` dan `/syarat` (Bahasa Indonesia): data apa yang disimpan, suara
  tidak diunggah, data tidak dijual, bisa dihapus lewat Hapus Semua Riwayat
  & Memori, skor AI adalah panduan bukan penilaian profesional, pembayaran
  simulasi. Tertaut di footer. **Tidak ada kontak dukungan yang ditulis —
  saluran dukungan resmi masih diputuskan pemilik aplikasi** (tidak ada email/
  telepon yang dikarang).

## Formal / Santai

- Sebelum sesi (skenario tetap, disesuaikan, atau Roleplay Bebas), pengguna
  memilih register: Santai (default, bahasa sehari-hari) atau Formal (bahasa
  baku, sapaan "Anda"). Tersimpan di `PracticeSession.register` dan
  `Evaluation.register`; dipakai di system prompt LLM dan (ringan) di balasan
  rule-based. Ini langkah pertama dari poin 9 — paket profesi dan mode Bahasa
  Inggris belum dibangun.

## Yang DITUNDA (sengaja tidak dibangun di versi ini)

- Fitur tim/institusi (admin, tugas, dasbor anggota) — butuh model multi-akun.
- Ulasan ahli manusia / latihan berpasangan / komunitas.
- Pembayaran nyata Midtrans (langganan tetap simulasi + tombol disembunyikan).
- Leaderboard publik, perpustakaan video kursus, mode Bahasa Inggris penuh.
- Pengingat email/push — tidak ada layanan email; drill dan pengingat hanya in-app.

## Struktur

```
prisma/schema.prisma      # User (email + passwordHash scrypt),
                          # LearnerProfile, LearnerMemory, PracticeSession
                          # (scenarioId kini opsional — null untuk Roleplay Bebas),
                          # CustomRoleplay (skenario buatan pengguna + kartu
                          # persona & rubrik JSON, Cascade saat akun dihapus;
                          # sourceScenarioId + customized untuk turunan skenario
                          # tetap hasil duplikasi lama "Sesuaikan & Mainkan"),
                          # CustomPillar + CustomScenario (Skenarioku/Pilarku:
                          # pilar buatan pengguna maks 5, skenario tersimpan
                          # maks 20, pillarKey slug bawaan atau custom:<id>,
                          # playCount; PracticeSession.customScenarioId
                          # opsional, SetNull saat skenario dihapus),
                          # PracticeSession.openingVariant (varian pembuka yang dipakai),
                          # SessionMessage, AdaptationEvent, Evaluation
                          # (voiceSummary, sharpened, drillStatus, register),
                          # Diagnostic (Tes Awal + jalur belajar),
                          # Drill (latihan 2 menit, jatuh tempo besok),
                          # BrandProfile, BrandAudit, ContentReview, Subscription
src/lib/scenarios.ts      # Katalog 29 skenario (5 pilar) + rubrik per skenario +
                          # modelAnswer + tip (pelajaran 2 menit) per skenario
src/lib/custom-roleplay.ts # Roleplay Bebas: kartu persona, rubrik dinamis,
                          # 5 template, validasi + daftar kata yang diblokir, tahap & batas 12 giliran;
                          # pemetaan sifat 29 skenario tetap (traitForScenario),
                          # kartu persona dari skenario, rubrik hasil penyesuaian
                          # (buildCustomizedRubric: rubrik asli + 1 dimensi dari tujuan baru)
src/lib/custom-library.ts  # Skenarioku + Pilarku: batas 5 pilar / 20 skenario,
                          # palet warna & ikon tetap, pustaka dimensi rubrik,
                          # validasi pilar/skenario/rubrik, validasi wizard 3 langkah,
                          # duplikasi skenario bawaan → isian awal wizard,
                          # judul otomatis dari situasi, kartu persona skenario
src/lib/opening-variants.ts # 2 varian kalimat pembuka per skenario tetap +
                          # pickOpeningVariant (acak tiap sesi baru, dicatat di sesi)
src/lib/ai.ts             # Roleplay Agent, Adaptation Engine, Evaluation Agent
src/lib/llm-provider.ts   # Pemilihan penyedia LLM (OpenAI/Gemini/rule-based),
                          # panggilan OpenAI + Gemini (prompt sama), parse respons Gemini
src/lib/llm-usage.ts      # Batas LLM harian 30 giliran/pengguna/hari (WIB) —
                          # SATU batas untuk OpenAI maupun Gemini, dihitung hanya bila sukses
                          # (satu fungsi scoring per dimensi rubrik), Brand Audit,
                          # Content Coach — rule-based + OpenAI opsional; bank
                          # keberatan per sifat + LLM persona ketat untuk Roleplay Bebas;
                          # diagnosticScores (Tes Awal), computeVoiceMetrics + voiceNote,
                          # sharpenSentence, applyRegister/registerInstruction
src/lib/diagnostic.ts     # Tes Awal: 3 prompt situasi, scoreDiagnostic (4 dimensi),
                          # buildPath (2 dimensi terlemah → 3 skenario berurutan)
src/lib/feedback.ts       # Umpan balik: validasi rating 1-5 + komentar maks 1000,
                          # label bintang, cek pemilik (OWNER_EMAIL, server saja),
                          # ringkasan rata-rata + distribusi per bintang
src/lib/plans.ts          # Harga paket Free/Pro/Tim + trial 14 hari +
                          # flag SUBSCRIPTIONS_ENABLED (saat ini false)
src/lib/auth.ts           # Sesi custom: token acak (hash SHA-256 di DB), cookie httpOnly, 30 hari
src/lib/password.ts       # Hash scrypt + verifikasi password
src/lib/prisma.ts         # Prisma client
src/lib/ensure.ts         # Buat baris Subscription/Memory/BrandProfile (default Free)
src/app/page.tsx          # Landing + form Masuk/Daftar Email, sidebar gelap
                          # (Beranda, Arena Roleplay, Studio Skenario, Tes Awal,
                          # Laporan & Radar, Riwayat Latihan, Pengaturan & Profil,
                          # + "Umpan Balik Pengguna" bila akun pemilik) + mode gelap.
                          # Beranda (sapaan + streak + 4 kartu stat nyata + ticker
                          # tips + Jalur Belajarmu + Latihan Hari Ini + kartu skenario),
                          # Tes Awal, Arena Roleplay (pemilih Formal/Santai + tip
                          # 2 menit, tombol "Duplikasi & Sesuaikan"), Studio Skenario
                          # (Skenarioku: Pilar Bawaan + Pilarku, wizard Buat Skenario
                          # 3 langkah + review, Mainkan/Edit/Duplikasi/Hapus;
                          # Roleplay Bebas: form + template + kartu persona + rubrik,
                          # tombol "Simpan sebagai skenario" setelah evaluasi),
                          # Ruang Latihan (timer + jeda jujur, mikrofon Web Speech API
                          # + dengarkan balasan, tip + contoh jawaban), Hasil Evaluasi
                          # (suara, kalimat vs versi tajam, status drill, register)
                          # + kartu umpan balik bintang, Riwayat Latihan,
                          # Pengaturan & Profil (Memori Saya, Ganti Password,
                          # Personal Branding, Umpan Balik untuk Phatica — tanpa UI
                          # langganan, lihat bagian Paket Langganan di atas),
                          # Laporan & Radar (ring skor + radar 5 pilar + Wawasan AI)
src/app/privasi/page.tsx  # Kebijakan Privasi (statis, Bahasa Indonesia)
src/app/syarat/page.tsx   # Syarat Layanan (statis, Bahasa Indonesia)
src/app/api/diagnostic    # Tes Awal: GET (terbaru + progres jalur), POST (3 jawaban → skor + jalur)
src/app/api/drills        # Latihan 2 menit: GET (menunggu + selesai), POST (kirim jawaban, tandai selesai)
src/app/api/report        # Laporan Perkembangan dari data nyata pengguna
src/app/api/auth/login    # Masuk email + password (401 bila salah)
src/app/api/auth/logout   # Keluar, hapus sesi
src/app/api/auth/register # Daftar email + password (409 bila email sudah terdaftar)
src/app/api/auth/me       # {user:null} bila belum login
src/app/api/scenarios     # 29 skenario (401 bila belum login)
src/app/api/custom-roleplay        # Daftar Skenario Buatanmu milik akun (401 bila belum login)
src/app/api/custom-roleplay/create # Buat Skenario Buatanmu: validasi + blokir kata,
                          # kembalikan kartu persona + rubrik dinamis (401 bila belum login)
src/app/api/pillars         # Pilarku: GET (pilar milik akun + pilar bawaan),
                          # POST buat pilar (maks 5, 401 bila belum login)
src/app/api/pillars/manage  # POST ubah pilar ?id=; DELETE hapus pilar ?id=
                          # &fallback= (skenario dipindah ke pilar bawaan, tidak dihapus)
src/app/api/library         # Skenarioku: GET daftar skenario + Pilarku;
                          # POST buat skenario (maks 20, validasi rubrik 2–4)
src/app/api/library/detail?id=     # Satu skenario + kartu persona (prefill wizard)
src/app/api/library/manage?id=     # POST ubah skenario (validasi yang sama)
src/app/api/library/delete?id=     # Hapus skenario (sesi tetap tersimpan, tautan dilepas)
src/app/api/library/duplicate?id=  # Salin skenario bawaan jadi CustomScenario (langsung di server)
src/app/api/library/save-from-roleplay # POST { customRoleplayId } — simpan
                          # Roleplay Bebas jadi skenario Skenarioku (idempotent)
src/app/api/sessions      # Mulai sesi + daftar sesi (batas langganan nonaktif
                          # selama SUBSCRIPTIONS_ENABLED = false); terima juga
                          # { customRoleplayId } untuk memulai Roleplay Bebas,
                          # { customScenarioId } untuk memulai skenario Skenarioku
                          # (playCount +1, label "Skenarioku")
                          # dan { register: "formal" | "santai" }
src/app/api/sessions/detail?id=   # Detail satu sesi (termasuk customRoleplay bila Roleplay Bebas)
src/app/api/sessions/message?id=  # Balasan persona + adaptasi level; sesi custom
                          # memakai bank keberatan per sifat / LLM persona ketat,
                          # mengembalikan engine ("openai" / "rule-based (persona)"),
                          # stage, userTurns, maxTurns 12; terima juga metrik suara
                          # { voice: { used, durationSec } } dari transkripsi browser
src/app/api/sessions/end?id=      # Evaluasi 6+ tool + update memori; sesi custom
                          # dinilai dengan rubrik dinamisnya sendiri; membuat Drill
                          # otomatis + menyimpan voiceSummary, sharpened, drillStatus
src/app/api/feedback      # Umpan balik: POST kirim (login, rate-limit 10/jam,
                          # 1 penilaian per sesi); GET semua (HANYA pemilik,
                          # OWNER_EMAIL) atau ?mine=1 (milik sendiri)
src/app/api/dashboard     # Progres, batas bulan ini, memori, paket
src/app/api/memory        # Memori + Brand Profile
src/app/api/brand/*       # Profil brand, Brand Audit, Content Coach
src/app/api/subscription  # Paket + upgrade/trial (SIMULASI, backend tetap ada
                          # walau tombolnya disembunyikan)
src/app/api/history       # Hapus semua riwayat & memori
```

## Pengerasan (17 Nov 2026) — rate limit, batas LLM, reset password, migrasi, tes

- **Rate limiting (DB-backed, tabel `RateLimit` — tahan di serverless):**
  login maks 10 percobaan *gagal* per email+IP per 15 menit (lalu 429
  "Terlalu banyak percobaan, coba lagi 15 menit lagi", header `Retry-After`);
  login sukses mereset hitungan. Daftar maks 5 per IP per jam. Kirim pesan
  dan akhiri sesi maks 30 per pengguna per menit. Buat Roleplay Bebas maks 10
  per pengguna per jam. Bila database rate limit tidak terjangkau, request
  diizinkan (fail-open, tercatat di log) — login tetap gagal sendiri bila DB
  down, jadi tidak ada celah bypass. Konstanta di `src/lib/rate-limit.ts`.
- **Batas LLM harian (penghemat biaya OpenAI):** maks 30 giliran LLM per
  pengguna per hari (WIB), konstanta `LLM_DAILY_TURN_LIMIT = 30` di
  `src/lib/llm-usage.ts`. Bila tercapai, LLM dilewati, sesi lanjut dengan
  mesin rule-based (tanpa batas), dan UI menampilkan jujur "Batas AI hari ini
  tercapai — lanjut dengan mode latihan dasar, besok kembali normal".
  Dihitung HANYA bila panggilan LLM benar-benar berhasil. Giliran rule-based
  tidak dihitung dan tidak dibatasi.
- **Reset password (token penuh, jujur soal email):** model
  `PasswordResetToken` (hash SHA-256, sekali pakai via `usedAt`, 1 jam).
  `POST /api/auth/forgot` SELALU membalas pesan generik yang sama (tanpa
  enumerasi email); bila Resend terpasang, tautan dikirim ke email
  (`https://<host>/reset?token=...`, host dari header request — tidak pernah
  dicatat/log). `POST /api/auth/reset` menandai token terpakai dan menghapus
  SEMUA sesi pengguna. `POST /api/auth/change-password` (tab Memori Saya)
  butuh password lama; sesi di perangkat lain diakhiri, sesi perangkat ini
  tetap jalan.
- **Prisma Migrate (bukan lagi `db push`):** migrasi awal
  `prisma/migrations/20261117063029_init/migration.sql` (337 baris, 19 tabel
  termasuk `RateLimit`, `LlmUsage`, `PasswordResetToken`) dibuat dari schema
  saat ini via `prisma migrate diff --from-empty`. **Migrasi kedua
  `prisma/migrations/20261118054608_custom_library/migration.sql` (52 baris,
  hanya tabel baru `CustomPillar` + `CustomScenario` dan kolom
  `PracticeSession.customScenarioId`) dibuat via `prisma migrate diff`
  schema-lama → schema-baru (tanpa shadow database; migrasi awal tidak
  disentuh, plus `migration_lock.toml` standar yang sebelumnya belum ada).**
  Build Command Vercel baru:
  `prisma migrate deploy && npm run build`. **Database live lama (dibuat via
  `db push`) harus di-baseline sekali:** `prisma migrate resolve --applied
  20261117063029_init` — tanpa itu `migrate deploy` gagal karena tabel sudah
  ada. Baseline sekali itu cukup: `migrate deploy` berikutnya menerapkan
  ketiga migrasi sekaligus. Fallback: tetap pakai `npx prisma db push && npm run build`.
  `npm run build` lokal tetap `prisma generate && next build`.
- **Security headers:** `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  `Permissions-Policy` (kamera/mikrofon self, geolokasi/payment kosong), dan
  CSP moderat (`default-src 'self'`, `unsafe-inline` untuk style/script yang
  dibutuhkan Next.js). Halaman error ramah (`error.tsx`, `global-error.tsx`).
  Error server dicatat terstruktur (`console.error` JSON: route + timestamp
  + error id pendek yang bisa dikutip pengguna) — tanpa stack trace/rahasia
  di respons.
- **Tes otomatis:** `npm test` (Node built-in `node:test` + `tsx`, tanpa
  dependency baru) — 51 tes hijau: scoring/adaptasi AI, skor Tes Awal +
  jalur belajar, metrik suara, `sharpenSentence` (placeholder, tanpa angka
  karangan), matematika rate-limit, batas LLM harian, logika Skenarioku/
  Pilarku (validasi rubrik 2–4 + dimensi custom maks 1, batas 5 pilar /
  20 skenario, duplikasi skenario bawaan → isian wizard, validasi wizard
  3 langkah, judul otomatis dari situasi), dan validasi umpan balik
  (rating 0/6 ditolak, 1–5 diterima, komentar >1000 ditolak, cek pemilik,
  ringkasan rata-rata + distribusi bintang).
- **SEO + PWA + a11y:** `sitemap.ts` (`/`, `/privasi`, `/syarat`),
  `robots.ts` (allow all, sitemap dari `NEXT_PUBLIC_SITE_URL` atau fallback
  https://phatica.vercel.app), metadata Open Graph + Twitter card
  (`/logo.webp`), `public/manifest.webmanifest` (tema #6366F1 / latar
  #F8FAFC), `html lang="id"`, `aria-label` di tombol mikrofon, dan gaya
  `:focus-visible` di `globals.css`.

## Yang belum / batasan jujur

- **Reset password lewat email butuh layanan email (Resend).** Alur token
  reset (sekali pakai, 1 jam) sudah jadi dan dites di server lokal; tapi
  email reset HANYA terkirim bila `RESEND_API_KEY` + `EMAIL_FROM` dipasang
  di Vercel. Tanpa itu, form "Lupa password?" menampilkan pesan jujur bahwa
  layanan email belum dipasang — dan tidak ada token yang dibocorkan.
  Ganti password untuk pengguna yang sudah masuk (tab Memori Saya) jalan
  tanpa email. Yang harus kamu tes setelah deploy: daftar dengan email →
  masuk Beranda, dan (bila Resend dipasang) Lupa password? → cek email →
  atur password baru → masuk lagi.
- **Kunci LLM belum terpasang di server.** OpenAI maupun Gemini sama-sama
  belum diisi di Vercel — situs live masih memakai rule-based sampai kunci
  ditambahkan (lihat "Penyedia LLM: OpenAI & Gemini"). Panggilan Gemini baru
  diverifikasi lewat unit test dengan respons tiruan, belum terhadap API
  Google yang sebenarnya. Kuota gratis Gemini tidak dijamin.
- **Tes Daftar live masih menunggu.** Daftar dengan email → masuk Beranda
  belum dites terhadap database live setelah perubahan ini; begitu juga
  skenario Pilar V dan jawaban Gemini end-to-end (baru dites di unit test
  dan smoke test lokal).
  Upgrade/trial hanya mengubah paket di database.
  Tidak ada Midtrans live, tidak ada tagihan nyata.
- **Tanpa scheduler posting, auto-DM, atau analitik follower** — sesuai desain
  Pilar IV (coaching saja).
- AI tanpa kunci LLM (OpenAI/Gemini) memakai mesin rule-based — sesi dan evaluasi tetap
  jalan penuh, skor dihitung dari metrik transkrip, tidak mengarang angka.
  Roleplay Bebas tanpa kunci memakai bank keberatan per sifat; dengan kunci,
  persona menjawab lewat LLM dengan system prompt ketat dari kartu persona.
- **Batas Roleplay Bebas yang jujur:** blokir kata hanya menyaring kata,
  bukan konteks; nama orang nyata tidak bisa dideteksi secara andal —
  gunakan peran umum, bukan nama asli seseorang. Sesi custom dibatasi 12
  giliran pengguna.
- **Batas Tes Awal & suara yang jujur:** skor Tes Awal memakai metrik
  transkrip yang sama dengan evaluator — bukan penilaian manusia, jadi
  angka itu panduan, bukan vonis. Suara butuh Chrome (atau browser yang
  mendukung Web Speech API) + izin mikrofon; kecepatan dan kata pengisi
  dihitung dari transkripsi browser, bukan analisis audio. Drill dan
  pengingat hanya ada di aplikasi — belum ada email/push.
- **Batas Skenarioku yang jujur:** skenario dan pilar buatanmu privat per
  akun (tidak bisa dibagikan ke akun lain); tanpa kunci LLM sesi
  tetap jalan penuh dengan mesin rule-based; Jalur Belajar Tes Awal masih
  memakai 29 skenario bawaan — skenario Skenarioku bisa dimainkan dan
  dilacak, tapi tidak dimasukkan otomatis ke jalur belajar. Menghapus
  skenario tidak menghapus riwayat sesinya; menghapus pilar tidak menghapus
  skenarionya (dipindah ke pilar bawaan pilihanmu).
- **Yang sengaja ditunda:** fitur tim/institusi (admin, tugas, dasbor
  anggota), ulasan ahli manusia / latihan berpasangan / komunitas,
  pembayaran nyata Midtrans, leaderboard, perpustakaan video kursus,
  mode Bahasa Inggris penuh. Dukungan: saluran kontak resmi masih
  diputuskan pemilik aplikasi — tidak ada email/telepon yang ditulis
  di halaman mana pun.
