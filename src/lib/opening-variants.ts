// Varian kalimat pembuka untuk 29 skenario tetap.
// Setiap sesi baru (disesuaikan maupun tidak) memakai salah satu secara acak:
// kalimat pembuka asli (indeks 0) atau salah satu varian di bawah ini.
// Indeks yang dipakai dicatat di PracticeSession.openingVariant.
// Daftar id skenario di sini TIDAK mengubah katalog — hanya tambahan varian.
export const OPENING_VARIANTS: Record<string, string[]> = {
  "interpersonal-wawancara-kerja": [
    "Oke, langsung saja: dari semua pelamar minggu ini, apa satu hal yang membuatmu berbeda — dan jangan jawab dengan kata sifat, saya mau bukti.",
    "Saya lihat CV kamu. Bagus di atas kertas. Sekarang buktikan ke saya: ceritakan satu hasil nyata yang kamu capai, bukan tugas yang kamu kerjakan.",
  ],
  "interpersonal-wawancara-beasiswa": [
    "Beasiswa ini bukan hadiah — ini investasi negara. Jadi saya tanya sekali lagi: apa yang negara dapat kalau membiayai kamu?",
    "Saya sudah baca esaimu. Sekarang saya mau dengar langsung: rencanamu setelah lulus itu nyata, atau cuma tulisan yang bagus?",
  ],
  "interpersonal-orang-tua": [
    "Nak, duduk dulu. Ayah tidak marah — Ayah cuma khawatir. Tapi Ayah perlu tahu: rencanamu ini sudah dipikirkan matang-matang, atau cuma ikut-ikutan teman?",
    "Ayah dan Ibu sudah berkorban banyak. Sekarang Ayah tanya baik-baik: kapan kamu bisa buktikan pilihanmu ini bukan jalan yang salah?",
  ],
  "interpersonal-minta-maaf": [
    "Aku sudah dengar kata maaf itu. Sekarang aku mau dengar: kamu paham nggak sih kenapa aku sampai segini kecewanya?",
    "Oke, kamu di sini. Tapi sebelum kamu ngomong, aku mau kamu dengar dulu — kemarin itu rasanya seperti apa buat aku.",
  ],
  "interpersonal-phk": [
    "Saya tidak akan berputar-putar: keputusan sudah diambil di atas. Yang bisa kita bicarakan sekarang cuma hak-hakmu — silakan tanya apa saja sebelum tanda tangan.",
    "Duduk. Saya tahu ini mengejutkan. Tapi surat ini harus selesai hari ini — kamu mau tanya dulu soal pesangon, atau langsung tanda tangan?",
  ],
  "interpersonal-teguran": [
    "Kita bicara di depan tim supaya jelas: ini bukan pertama kali. Saya mau dengar — apa rencanamu supaya tidak terulang keempat kalinya?",
    "Saya tidak suka menegur di depan orang, tapi saya tidak punya pilihan lagi. Jelaskan ke saya: apa yang sebenarnya terjadi dengan laporan itu?",
  ],
  "interpersonal-menolak-tawaran": [
    "Saya senang kamu diterima. Tapi saya jujur saja: anggaran kami memang segitu. Kalau kamu mau nego, silakan — tapi saya butuh jawaban hari ini.",
    "Tawaran ini sudah disetujui manajemen, jadi ruang geraknya kecil. Coba kamu bilang: apa yang kamu butuhkan supaya bisa bilang ya?",
  ],
  "interpersonal-menolak-pinjaman": [
    "Bro, aku tahu kamu mungkin mikir aku selalu minta-minta. Tapi kali ini beda, serius. Kamu bisa bantu aku sekali ini saja?",
    "Aku nggak enak sebenarnya minta lagi. Tapi aku kepepet — kamu satu-satunya yang bisa aku hubungi sekarang.",
  ],
  "interpersonal-feedback-bawahan": [
    "Saya dengar kamu mau bicara soal kinerja saya. Silakan — tapi saya mau jujur dulu: datanya telat, bukan saya yang lambat.",
    "Kamu panggil saya. Oke, saya di sini. Tapi sebelum kamu mulai, saya mau kamu tahu: tim lain juga punya andil di keterlambatan ini.",
  ],
  "interpersonal-bicara-rapat": [
    "Kita kehabisan waktu, tapi saya kasih kamu satu menit. Langsung ke intinya ya — idemu ini menghemat berapa, dan butuh apa dari kami?",
    "Oke, sebelum kita tutup — kamu dari tadi angkat tangan. Cepat, satu menit, dan jangan mulai dari latar belakang.",
  ],
  "interpersonal-atasan": [
    "Saya tahu kamu sudah penuh, tapi klien ini penting buat kita. Saya butuh kamu yang pegang — kamu bisa atur waktumu, kan?",
    "Jumat sore begini saya tidak enak nambah kerjaan. Tapi cuma kamu yang saya percaya untuk proyek ini. Gimana, bisa?",
  ],
  "interpersonal-rekan": [
    "Eh, jangan baper ya — aku cuma bercanda soal presentasi kemarin. Kamu kan tahu aku memang suka iseng.",
    "Loh, kok mukanya gitu? Aku cuma bilang presentasimu lumayan. Itu pujian, lho — kenapa jadi serius?",
  ],
  "interpersonal-negosiasi": [
    "Saya sudah lihat datamu, dan saya hargai itu. Tapi saya harus jujur: anggaran tahun ini tipis sekali. Coba kamu bilang, angka berapa yang masih masuk akal buat kita berdua?",
    "Review tahunan ini bukan cuma soal angka. Tapi karena kamu tanya: apa yang kamu bawa tahun ini yang membuat kenaikan itu pantas?",
  ],
  "krisis-hoax-viral": [
    "UPDATE: makin banyak korban yang lapor ke kami. Owner toko ini masih diam — apa jangan-jangan memang benar?",
    "Netizen sudah ramai, buktinya makin banyak. Kami tantang owner-nya: klarifikasi sekarang, atau kami anggap tuduhan ini benar.",
  ],
  "krisis-review-bintang1": [
    "Saya sudah chat admin tiga kali, tidak dibalas. Sekarang saya tulis di sini supaya semua orang tahu: pelayanan toko ini buruk.",
    "Bintang 1 ini bukan karena saya jahat — ini peringatan buat calon pembeli lain. Barang rusak, admin hilang. Kalian nilai sendiri.",
  ],
  "krisis-live": [
    "Kak, kolom komentar sudah penuh tanya soal isu viral itu. Dijawab dong kak — kami di sini bukan cuma mau nonton jualan.",
    "Host-nya kok diam saja? Kami tunggu jawabannya, kak. Jangan pura-pura tidak lihat komentar.",
  ],
  "sales-skeptical": [
    "Kak, saya bandingkan lagi: di Shopee harganya beda jauh, ulasannya juga bagus. Coba jelaskan, kenapa saya harus beli di kakak?",
    "Saya hampir checkout di toko sebelah. Tapi saya tanya dulu ke kakak: ada garansi atau bonus apa yang bikin harga kakak masuk akal?",
  ],
  "sales-pitch-investor": [
    "Dua menit, mulai dari sekarang. Saya tidak mau dengar visi — saya mau dengar angka: berapa pelanggan bayarmu hari ini?",
    "Saya dengar pitch setiap minggu. Buat saya tertarik dalam 30 detik pertama, atau saya anggap ini sama seperti yang lain.",
  ],
  "sales-closing-wa": [
    "Kak, saya masih mikir-mikir. Sebenarnya saya sudah bandingkan dengan toko lain — harga kakak agak mahal. Ada diskon nggak?",
    "Halo kak, saya balik lagi. Barang yang kemarin itu masih ada, kan? Saya mau tanya dulu — kalau rusak, bisa tukar nggak?",
  ],
  "branding-elevator-pitch": [
    "Networking begini memang cepat. Oke, 30 detik: kamu siapa dan kenapa saya harus ingat kamu setelah acara ini?",
    "Saya ketemu puluhan orang malam ini. Coba buat saya ingat kamu — siapa kamu, kerjamu apa, dan apa yang bikin kamu beda?",
  ],
  "branding-hater": [
    "Kontenmu ini cuma teori dari buku. Coba tunjukkan satu hasil nyatamu sendiri — kalau ada, saya minta maaf di kolom ini.",
    "Pengikutmu pada ketipu semua. Kamu jualan mimpi, bukan ilmu. Berani debat saya di sini, depan semua orang?",
  ],
  "branding-cancel": [
    "Postingan lamamu itu sudah di-screenshot ribuan orang. Mau klarifikasi atau mau pura-pura tidak terjadi?",
    "Kami tunggu penjelasanmu. Dan tolong jangan pakai alasan 'itu dulu' — kami mau dengar kamu bertanggung jawab atau tidak.",
  ],
  "branding-endorsement": [
    "Kami suka konten kakak, makanya kami hubungi. Tapi budget kami untuk kreator baru memang exposure dulu — kakak mau coba satu postingan?",
    "Halo kak, rate card-nya boleh dikirim? Sejujurnya budget kami terbatas — tapi kami bisa kasih produk + exposure yang lumayan.",
  ],
  "branding-podcast": [
    "Pendengar kami suka yang konkret. Jadi saya langsung saja: ceritakan satu momen ketika keahlianmu benar-benar diuji — dan hasilnya?",
    "Selamat datang! Sebelum kita mulai, saya mau tahu: apa satu hal yang pendengar kami akan ingat darimu setelah episode ini?",
  ],
  "public-speaking-pidato-pembukaan": [
    "Audiens sudah duduk semua dan menunggu. Sambutanmu cuma 3 menit — buat mereka merasa datang ke acara ini adalah keputusan yang tepat.",
    "Saya serahkan panggungnya ke kamu. Ingat: jangan baca teks, tatap audiens, dan tutup dengan satu kalimat yang mereka ingat.",
  ],
  "public-speaking-presentasi-atasan": [
    "Saya sudah baca slidemmu. Sekarang saya mau dengar langsung: dari semua angka di sana, mana satu hasil yang paling kamu banggakan — dan kenapa?",
    "Waktu kita 10 menit. Langsung ke intinya: apa masalahnya, apa yang kamu lakukan, dan apa hasilnya — tanpa latar belakang yang panjang.",
  ],
  "public-speaking-mc-formal": [
    "Segmen berikutnya tamu pentingnya sudah menunggu di belakang panggung. Bawa audiens ke sana dengan mulus — jangan sampai ada jeda canggung.",
    "Audiens mulai gelisah karena molor. Kamu MC-nya — tenangkan ruangan dengan satu kalimat, lalu lanjut ke segmen berikutnya.",
  ],
  "public-speaking-kuliah-umum": [
    "Aula ini besar dan suaramu harus sampai ke baris paling belakang. Mulai dengan sesuatu yang membuat kami semua menoleh — bukan dengan perkenalan panjang.",
    "Saya sudah dengar banyak ceramah hari ini. Buat yang ini beda: mulai dari cerita atau pertanyaan, bukan dari definisi.",
  ],
  "public-speaking-debat-forum": [
    "Lawanmu baru saja bilang pendapatmu tidak realistis. Forum menunggu jawabanmu — jawab dengan bukti, bukan dengan nada tinggi.",
    "Moderator di sini tidak akan melindungimu. Argumenmu lemah di satu titik — perbaiki sekarang, atau lawanmu akan menyerang titik itu lagi.",
  ],
};

// Pilih satu kalimat pembuka: indeks 0 = kalimat asli, 1..n = varian.
// Dipilih acak setiap sesi baru, supaya replay tidak identik.
export function pickOpeningVariant(scenarioId: string, opening: string): { text: string; index: number } {
  const variants = OPENING_VARIANTS[scenarioId] || [];
  const options = [opening, ...variants];
  const index = Math.floor(Math.random() * options.length);
  return { text: options[index], index };
}
